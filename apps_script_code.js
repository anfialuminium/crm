function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  var sheetName = "מחירון"; 
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  
  // If no sheet found, return error
  if (!sheet) {
     return ContentService.createTextOutput(JSON.stringify({ error: "Sheet 'מחירון' not found" }))
       .setMimeType(ContentService.MimeType.JSON);
  }

  var action = e.parameter.action;

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
}


/*
הוראות מעודכנות:
1. בגיליון "מחירון", סדר העמודות חייב להיות:
   A: קטגוריה (למשל: ידיות)
   B: שם מוצר
   C: מחיר
   D: קישור לתמונה
2. מלא את הנתונים לכל המוצרים. השינויים שתעשה כאן ישתקפו באתר.
3. בצע פריסה מחדש (Deploy -> New deployment) כדי שהשינויים בקוד יחולו.
*/
