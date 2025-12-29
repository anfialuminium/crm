function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  var action = e.parameter.action;

  // Notification action - does NOT require a sheet
  if (action == "sendNotification") {
    var recipient = e.parameter.email;
    var subject = e.parameter.subject;
    var body = e.parameter.body;
    
    if (!recipient || !body) {
      return ContentService.createTextOutput(JSON.stringify({ error: "Missing recipient or body" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    try {
      MailApp.sendEmail(recipient, subject || "CRM Notification", body);
      return ContentService.createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  // Row-based actions (Pricing) - DO require a sheet
  var sheetName = "מחירון"; 
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
     return ContentService.createTextOutput(JSON.stringify({ error: "No spreadsheet bound to this script" }))
       .setMimeType(ContentService.MimeType.JSON);
  }
  
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
     return ContentService.createTextOutput(JSON.stringify({ error: "Sheet 'מחירון' not found" }))
       .setMimeType(ContentService.MimeType.JSON);
  }

  if (action == "getProducts" || !action) {
    // Get all data raw
    var data = sheet.getDataRange().getValues();
    
    // Return raw data to let client handle logic
    // This copes with changing column structures
    return ContentService.createTextOutput(JSON.stringify({
        data: data,
        structure: "raw"
    })).setMimeType(ContentService.MimeType.JSON);
  }


  if (action == "savePrice") {
    var productName = e.parameter.name;
    var newPrice = e.parameter.price;
    
    if (!productName) {
         return ContentService.createTextOutput(JSON.stringify({ error: "No product name provided" }))
           .setMimeType(ContentService.MimeType.JSON);
    }

    var data = sheet.getDataRange().getValues();
    // Detect columns again roughly (assuming structure is consistent with client assumption or fixed)
    // We'll search column A (index 0) or look for header
    
    var nameIdx = 0;
    var priceIdx = 1;
    
    // Simple header check
    if (data.length > 0) {
       var headers = data[0].map(function(h) { return String(h).toLowerCase().trim(); });
       var nI = headers.findIndex(function(h) { return h.indexOf('מוצר') > -1 || h.indexOf('name') > -1; });
       var pI = headers.findIndex(function(h) { return h.indexOf('מחיר') > -1 || h.indexOf('price') > -1; });
       if (nI > -1) nameIdx = nI;
       if (pI > -1) priceIdx = pI;
    }

    var rowIndex = -1;
    for (var i = 0; i < data.length; i++) {
        if (String(data[i][nameIdx]).trim() == String(productName).trim()) {
            rowIndex = i;
            break;
        }
    }

    if (rowIndex > -1) {
        // Update the cell (rowIndex is 0-based, getRange is 1-based)
        sheet.getRange(rowIndex + 1, priceIdx + 1).setValue(newPrice);
        
        return ContentService.createTextOutput(JSON.stringify({ success: true, updated: productName, price: newPrice }))
           .setMimeType(ContentService.MimeType.JSON);
    } else {
        return ContentService.createTextOutput(JSON.stringify({ error: "Product not found" }))
           .setMimeType(ContentService.MimeType.JSON);
    }
  }
  if (action == "sendNotification") {
    var recipient = e.parameter.email;
    var subject = e.parameter.subject;
    var body = e.parameter.body;
    
    if (!recipient || !body) {
      return ContentService.createTextOutput(JSON.stringify({ error: "Missing recipient or body" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    try {
      MailApp.sendEmail(recipient, subject || "CRM Notification", body);
      return ContentService.createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  // Default fallback if action not matched
  return ContentService.createTextOutput(JSON.stringify({ error: "Action not recognized" }))
         .setMimeType(ContentService.MimeType.JSON);
}


/*
הוראות מעודכנות:
1. בגיליון "מחירון", סדר העמודות צריך להיות:
   A: שם מוצר
   B: מחיר
   (ניתן להוסיף שורת כותרת: "מוצר", "מחיר")
2. מלא את הנתונים לכל המוצרים. 
3. בצע פריסה מחדש (Deploy -> New deployment) אם שינית את הקוד, אך לשינוי נתונים בגיליון בלבד אין צורך בפריסה מחדש.
4. וודא שב-aloni.html הכתובת (DATA_URL) תואמת את הכתובת של ה-Web App שלך.
*/
