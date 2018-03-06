const fontAwesome = document.createElement("link");
fontAwesome.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.css";
fontAwesome.type = "text/css";
fontAwesome.rel = "stylesheet";
document.getElementsByTagName("head")[0].appendChild(fontAwesome);

const toTitleCase = (name) => name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();

const getBookingPrices = () => {
  const table = [...document.querySelectorAll('dt,dd')];

  let bookingPrices = {};
  for (let i = 0; i < table.length; i++) {
    if (table[i].innerText == 'channel:') {
      if (table[i + 1].innerText.match(/Hostelworld/)) {
        bookingPrices['channel'] = 'Hostelworld';
      } else {
        bookingPrices['channel'] = 'Hostelsclub';
      }
    } else if (table[i].innerText == 'total price:') {
      bookingPrices['total'] = parseFloat(table[i + 1].innerText.match(/\d+\.\d+/g));
    } else if (table[i].innerText == 'deposit:') {
      bookingPrices['deposit'] = parseFloat(table[i + 1].innerText.match(/\d+\.\d+/g));
    } else if (table[i].innerText == 'name:') {
      let name = table[i + 1].innerText.replace(/ *\([^)]*\) */g, '').split(' ').slice(-1)[0];
      bookingPrices['name'] = toTitleCase(name);
    }
  }

  return bookingPrices;
};

const useNewCommision = () => {
  const importDate = document.getElementsByClassName('importInfo')[0].childNodes[1].getAttribute('title');
  return new Date(importDate) >= new Date("2018-02-01");
};

const getPax = () => {
  const table = [...document.querySelectorAll('dt,dd')];

  let pax;
  for (let i = 0; i < table.length; i++) {
    if (table[i].innerText.match(/2 Bed Priv/g)) {
      pax = 2;
    } else if (table[i].innerText.match(/3 Bed Priv/g)) {
      pax = 3;
    } else if (table[i].innerHTML.match(/beds/g)) {
      pax = parseInt(table[i + 1].innerText);
    }
  }

  return pax;
};

const calculateCityTax = (bookingPrices, newCommision, pax, extraPrice=0) => {
  let { channel, total, deposit, name } = bookingPrices;
  const commision = channel == 'Hostelsclub' ? 0.1 : newCommision ? 0.15 : 0.12;
  total = channel == 'Hostelsclub' ? total - 2 : total;
  total = extraPrice < 0 ? total + extraPrice : total;
  deposit = extraPrice < 0 ? total * commision : deposit;

  const cityTax = {
    single: {
      name,
      total,
      deposit,
      einnahme: extraPrice < 0 ? total - deposit : total + extraPrice - deposit,
      cityTax: extraPrice < 0 ? total * 0.05 : (total + extraPrice) * 0.05,
      accommodation: extraPrice < 0 ? (total * 1.05) - deposit : ((total + extraPrice) * 1.05) - deposit
    },
    evenSplit: {
      name,
      total,
      deposit: deposit / pax,
      einnahme: extraPrice < 0 ? (total / pax) - (deposit / pax) : ((total + extraPrice) / pax) - (deposit / pax),
      cityTax: extraPrice < 0 ? (total / pax) * 0.05 : ((total + extraPrice) / pax) * 0.05,
      accommodation: extraPrice < 0 ? (total / pax * 1.05) - (deposit / pax) : ((total + extraPrice) / pax * 1.05) - (deposit / pax)
    },
    personWhoBooked: {
      name,
      total,
      deposit,
      einnahme: extraPrice < 0 ? (total / pax) - deposit : ((total + extraPrice) / pax) - deposit,
      cityTax: extraPrice < 0 ? (total / pax) * 0.05 : ((total + extraPrice) / pax) * 0.05,
      accommodation: extraPrice < 0 ? (total / pax * 1.05) - deposit : ((total + extraPrice) / pax * 1.05) - deposit
    },
    otherGuests: {
      name,
      total,
      deposit: 0,
      einnahme: extraPrice < 0 ? total / pax : (total + extraPrice) / pax,
      cityTax: extraPrice < 0 ? (total / pax) *0.05 : ((total + extraPrice) / pax) *0.05,
      accommodation: extraPrice < 0 ? (total / pax * 1.05) : ((total + extraPrice) / pax * 1.05)
    }
  };

  return cityTax;
};

const buildEvenCopyString = (name, cityTax, einnahme, pax) => {
  const copyString = `${name}\t${Number(einnahme).toFixed(2)}\t${Number(cityTax).toFixed(2)}\n`;
  return copyString.repeat(pax);
};

const buildPersonWhoBookedCopyString = (name, cityTaxPWB, einnahmePWB, cityTaxOtherGuests, einnahmeOtherGuests, pax) => {
  const personWhoBookedCopyString = `${name}\t${Number(einnahmePWB).toFixed(2)}\t${Number(cityTaxPWB).toFixed(2)}\n`;
  const otherGuestsCopyString = `${name}\t${Number(einnahmeOtherGuests).toFixed(2)}\t${Number(cityTaxOtherGuests).toFixed(2)}\n`;
  return personWhoBookedCopyString + otherGuestsCopyString.repeat(pax - 1);
};

const singleButtonClick = (event) => {
  document.getElementById("singleTextarea").select();
  document.execCommand('copy');
};

const evenSplitButtonClick = () => {
  document.getElementById("evenSplitTextarea").select();
  document.execCommand('copy');
};

const personWhoBookedButtonClick = () => {
  document.getElementById("personWhoBookedTextarea").select();
  document.execCommand('copy');
};

const onInputEnterPress = (event) => {
  if (event.keyCode == 13) {
    recalculateButtonClick();
  }
};

const recalculateButtonClick = () => {
  const newPax = parseInt(document.getElementById("pax").value);
  let extraNightsPrice = document.getElementById("extraNights").value;
  if (!isNaN(extraNightsPrice) && extraNightsPrice !== '' && newPax > 0) {
    extraNightsPrice = parseFloat(extraNightsPrice);
    const newCityTax = calculateCityTax(bookingPrices, newCommision, newPax, extraNightsPrice);
    document.getElementById('cityTaxDiv').remove();
    appendTableNodeToDOM(newCityTax, newPax);
  }
};

const appendTableNodeToDOM = (cityTax, pax) => {
  const { single, evenSplit, personWhoBooked, otherGuests } = cityTax;
  const htmlTable = `</br></br>
  <table id="cityTaxTable" class="table">
    <thead>
      <tr>
        <th class="table-header"></th>
        <th class="table-header">Single Payer</th>
        <th class="${pax == 1 ? 'hidden' : null} table-header">Even Split</th>
        <th class="${pax == 1 ? 'hidden' : null} table-header">Person</br>Who</br>Booked</th>
        <th class="${pax == 1 ? 'hidden' : null} table-header">Other</br>Guests</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <th class="deposit">Deposit</th>
        <td class="deposit">${Number(single.deposit).toFixed(2)} €</td>
        <td class="${pax == 1 ? 'hidden' : null} deposit">${Number(evenSplit.deposit).toFixed(2)} €</td>
        <td class="${pax == 1 ? 'hidden' : null} deposit">${Number(personWhoBooked.deposit).toFixed(2)} €</td>
        <td class="${pax == 1 ? 'hidden' : null} deposit">${Number(otherGuests.deposit).toFixed(2)} €</td>
      </tr>
      <tr>
        <th class="einnahme">Einnahmen</th>
        <th class="einnahme biggerText">${Number(single.einnahme).toFixed(2)} €</th>
        <td class="${pax == 1 ? 'hidden' : null} einnahme">${Number(evenSplit.einnahme).toFixed(2)} €</td>
        <td class="${pax == 1 ? 'hidden' : null} einnahme">${Number(personWhoBooked.einnahme).toFixed(2)} €</td>
        <td class="${pax == 1 ? 'hidden' : null} einnahme">${Number(otherGuests.einnahme).toFixed(2)} €</td>
      </tr>
      <tr>
        <th class="cityTax">5% City Tax</th>
        <th class="cityTax biggerText">${Number(single.cityTax).toFixed(2)} €</th>
        <td class="${pax == 1 ? 'hidden' : null} cityTax">${Number(evenSplit.cityTax).toFixed(2)} €</td>
        <td class="${pax == 1 ? 'hidden' : null} cityTax">${Number(personWhoBooked.cityTax).toFixed(2)} €</td>
        <td class="${pax == 1 ? 'hidden' : null} cityTax">${Number(otherGuests.cityTax).toFixed(2)} €</td>
      </tr>
      <tr>
        <th class="accommodation">Accommodation</th>
        <th class="accommodation biggerText">${Number(single.accommodation).toFixed(2)} €</th>
        <td class="${pax == 1 ? 'hidden' : null} accommodation">${Number(evenSplit.accommodation).toFixed(2)} €</td>
        <td class="${pax == 1 ? 'hidden' : null} accommodation">${Number(personWhoBooked.accommodation).toFixed(2)} €</td>
        <td class="${pax == 1 ? 'hidden' : null} accommodation">${Number(otherGuests.accommodation).toFixed(2)} €</td>
      </tr>
      <tr>
        <td class="table-header"></td>
        <td class="table-header">
          <button title="Copy to clipboard" id="singleButton" class="btn btn-info"><i class="fa fa-files-o"></i></button>
        </td>
        <td class="${pax == 1 ? 'hidden' : null} table-header">
          <button title="Copy to clipboard" id="evenSplitButton" class="btn btn-info"><i class="fa fa-files-o"></i></button>
        </td>
        <td class="${pax == 1 ? 'hidden' : null} table-header">
          <button title="Copy to clipboard" id="personWhoBookedButton" class="btn btn-info"><i class="fa fa-files-o"></i></button>
        </td>
        <td class="${pax == 1 ? 'hidden' : null} table-header"></td>
      </tr>
      <tr>
        <td colspan="3" class="table-header table-label">Total price of added or subtracted nights ('-' for subtracting)</td>
        <td class="table-header">
          <input id="extraNights" class="table-input" placeholder="-22">
        </td>
        <td class="table-header">
          <button title="Recalculate" id="recalculateButton" class="btn btn-success"><i class="fa fa-calculator"></i></button>
        </td>
      </tr>
      <tr>
        <td colspan="3" class="table-header table-label">No. of Guests</td>
        <td class="table-header">
          <input id="pax" class="table-input" value="${pax}">
        </td>
      </tr>
    </tbody>
  </table>
  <textarea id="singleTextarea" class="hide-textarea">${single.name}\t${Number(single.einnahme).toFixed(2)}\t${Number(single.cityTax).toFixed(2)}</textarea>
  <textarea id="evenSplitTextarea" class="hide-textarea">${buildEvenCopyString(evenSplit.name, evenSplit.cityTax, evenSplit.einnahme, pax)}</textarea>
  <textarea id="personWhoBookedTextarea" class="hide-textarea">${buildPersonWhoBookedCopyString(personWhoBooked.name, personWhoBooked.cityTax, personWhoBooked.einnahme, otherGuests.cityTax, otherGuests.einnahme, pax)}</textarea>
  `

  const node = document.createElement('div');
  node.setAttribute('id', 'cityTaxDiv');
  node.innerHTML = htmlTable;

  document.getElementsByClassName('dl-horizontal')[1].appendChild(node);
  document.getElementById('singleButton').addEventListener('click', singleButtonClick);
  document.getElementById('evenSplitButton').addEventListener('click', evenSplitButtonClick);
  document.getElementById('personWhoBookedButton').addEventListener('click', personWhoBookedButtonClick);
  document.getElementById('extraNights').addEventListener('keyup', onInputEnterPress);
  document.getElementById('pax').addEventListener('keyup', onInputEnterPress);
  document.getElementById('recalculateButton').addEventListener('click', recalculateButtonClick);
};

const appendNotesNodeToDom = (notes) => {
  const notesHtml = `
    <div id="showNotesModal" tabindex="-1" role="dialog" aria-labelledby="showNotesModal" aria-hidden="false" class="modal hide fade in">
      <div class="modal-header">
        <button type="button" data-dismiss="modal" aria-hidden="true" class="close" id="dismiss-modal-x">x</button>
        <h3 id="addNoteLabel">Notes</h3>
      </div>
      <div class="modal-body">
        ${notes}
        <div class="pull-right">
          <button id="dismiss-modal-button" data-dismiss="modal" class="btn">Close</button>
        </div>
      </div>
    </div>
    <div id="notesModalBackdrop" class="modal-backdrop fade in"></div>
  `

  const notesNode = document.createElement('div');
  notesNode.setAttribute('id', 'customNotes');
  notesNode.innerHTML = notesHtml;

  document.getElementById('globalLang').appendChild(notesNode);
};

const clearNotesModal = () => {
  document.getElementById('showNotesModal').classList.remove('show');
  document.getElementById('showNotesModal').classList.add('hide');
  document.getElementById('notesModalBackdrop').classList.add('hide');
};

const getNotes = () => {
  const notes = [...document.getElementsByClassName('notes')[1].getElementsByTagName('i')];

  let formattedNotes = '';
  for (let note of notes) {
    formattedNotes += `${note.innerText}</br>`
  }

  return formattedNotes;
};

const notesExist = () => {
  const notes = document.getElementsByClassName('notes')[1].innerText.replace(/^\s+|\s+$/g, '');
  return notes !== 'No notes present.';
};

const loadNotesModal = () => {
  const notes = getNotes();
  if (notesExist()) {
    appendNotesNodeToDom(notes);
    document.getElementById('showNotesModal').classList.remove('hide');
    document.getElementById('showNotesModal').classList.add('show');
    document.getElementById('dismiss-modal-x').addEventListener('click', clearNotesModal);
    document.getElementById('dismiss-modal-button').addEventListener('click', clearNotesModal);
  }
};

const bookingPrices = getBookingPrices();
const newCommision = useNewCommision();
const pax = getPax();
const cityTax = calculateCityTax(bookingPrices, newCommision, pax);

appendTableNodeToDOM(cityTax, pax);
loadNotesModal();
