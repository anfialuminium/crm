# מדריך התקנה והטמעה - מערכת CRM

## 📋 תוכן עניינים
1. [הקמת Supabase](#הקמת-supabase)
2. [הגדרת מסד הנתונים](#הגדרת-מסד-הנתונים)
3. [הגדרת הפרויקט](#הגדרת-הפרויקט)
4. [פריסה ל-GitHub Pages](#פריסה-ל-github-pages)
5. [שימוש במערכת](#שימוש-במערכת)
6. [טיפים ושיפורים](#טיפים-ושיפורים)

---

## 🚀 הקמת Supabase

### שלב 1: יצירת חשבון
1. היכנס ל-[Supabase](https://supabase.com)
2. לחץ על "Start your project"
3. התחבר עם GitHub או Google
4. צור פרויקט חדש:
   - **Name**: CRM-Hardware
   - **Database Password**: שמור את הסיסמה במקום בטוח!
   - **Region**: בחר אזור קרוב (Europe West או Middle East)

### שלב 2: קבלת פרטי התחברות
לאחר יצירת הפרויקט:
1. לחץ על ⚙️ **Settings** בתפריט הצד
2. לחץ על **API**
3. העתק את הערכים הבאים:
   - **Project URL** (למשל: `https://xxxxx.supabase.co`)
   - **anon public** key (מפתח ארוך)

---

## 🗄️ הגדרת מסד הנתונים

### שלב 1: הרצת הסכמה
1. בממשק Supabase, לחץ על **SQL Editor** בתפריט הצד
2. לחץ על **+ New query**
3. העתק את כל התוכן מקובץ `database/schema.sql`
4. הדבק בעורך ולחץ **RUN**
5. וודא שאין שגיאות (תראה הודעה ירוקה "Success")

### שלב 2: אימות הטבלאות
1. לחץ על **Table Editor** בתפריט הצד
2. וודא שהטבלאות הבאות נוצרו:
   - ✅ customers
   - ✅ products
   - ✅ deals
   - ✅ deal_items
   - ✅ product_colors
   - ✅ product_sizes
   - ✅ activities

### שלב 3: בדיקת נתוני דוגמה
הסכמה כוללת נתוני דוגמה:
- 3 לקוחות לדוגמה
- 6 מוצרים לדוגמה
- צבעים ומידות

תוכל לראות אותם בלשונית **Table Editor**.

### שלב 4: הגדרת הרשאות (RLS)
כדי שהמערכת תעבוד בצורה תקינה (במיוחד אם הפעלתם RLS), יש להריץ את מדיניות האבטחה:
1. בממשק Supabase, לחץ על **SQL Editor**
2. צור שאילתה חדשה (**New query**)
3. העתק את התוכן מקובץ `database/rls_policies.sql`
4. הדבק והרץ (**RUN**)
   - פעולה זו תאפשר גישה לנתונים עבור המערכת.

---

## ⚙️ הגדרת הפרויקט

### שלב 1: עדכון קובץ app.js
פתח את קובץ `app.js` ועדכן את השורות הבאות:

```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL'; // החלף עם ה-URL שלך
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'; // החלף עם המפתח שלך
```

**דוגמה:**
```javascript
const SUPABASE_URL = 'https://abcdefgh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

### שלב 2: בדיקה מקומית
1. פתח את `index.html` בדפדפן
2. פתח את ה-Console (F12)
3. וודא שאין שגיאות
4. בדוק שהמוצרים והלקוחות נטענים

---

## 🌐 פריסה ל-GitHub Pages

### אופציה 1: דרך GitHub Desktop (קל יותר)

1. **צור repository חדש:**
   - פתח GitHub Desktop
   - File → New Repository
   - Name: `crm-system`
   - Local Path: בחר את תיקיית הפרויקט
   - לחץ Create Repository

2. **העלה את הקבצים:**
   - GitHub Desktop יזהה את כל הקבצים
   - כתוב הודעת commit: "Initial CRM system"
   - לחץ "Commit to main"
   - לחץ "Publish repository"
   - בחר "Public" או "Private" (לפי העדפה)

3. **הפעל GitHub Pages:**
   - היכנס ל-GitHub.com
   - עבור ל-repository שלך
   - Settings → Pages
   - Source: בחר "main" branch
   - Folder: בחר "/ (root)"
   - לחץ Save

4. **קבל את הקישור:**
   - לאחר כמה דקות, תראה את הקישור:
   - `https://[username].github.io/crm-system/`

### אופציה 2: דרך שורת הפקודה

```bash
# אתחול Git
cd /path/to/crm
git init

# הוסף קבצים
git add .
git commit -m "Initial CRM system"

# צור repository ב-GitHub ואז:
git remote add origin https://github.com/[username]/crm-system.git
git branch -M main
git push -u origin main

# הפעל Pages דרך הממשק של GitHub
```

---

## 📱 שימוש במערכת

### יצירת עסקה חדשה

1. **בחר לקוח:**
   - בחר לקוח קיים מהרשימה
   - או לחץ "לקוח חדש" ליצירת לקוח חדש

2. **הוסף מוצרים:**
   - לחץ "הוסף מוצר"
   - בחר מוצר מהרשימה
   - הזן כמות
   - המחיר יתמלא אוטומטית (ניתן לעריכה)
   - אם המוצר דורש צבע/מידה - השדות יופיעו אוטומטית

3. **הנחה:**
   - הזן אחוז הנחה בשדה המתאים
   - הסכום יתעדכן אוטומטית

4. **שמירה:**
   - "שמור טיוטה" - שומר את העסקה כטיוטה
   - "שמור וסגור עסקה" - שומר ומסמן כזכייה

### ניהול לקוחות

1. לחץ על לשונית "לקוחות"
2. צפה ברשימת כל הלקוחות
3. לחץ "לקוח חדש" להוספת לקוח

### ניהול מוצרים

1. לחץ על לשונית "מוצרים"
2. צפה ברשימת כל המוצרים
3. הוסף מוצרים חדשים דרך Supabase Table Editor

---

## 💡 טיפים ושיפורים

### 1. אבטחה משופרת
```javascript
// הוסף Row Level Security (RLS) ב-Supabase:
// SQL Editor → New Query:

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

-- דוגמה למדיניות:
CREATE POLICY "Enable read access for all users" 
ON customers FOR SELECT 
USING (true);
```

### 2. הוספת אימות משתמשים
```javascript
// הוסף Supabase Auth:
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
});
```

### 3. ייצוא ל-Excel
הוסף כפתור לייצוא עסקאות:
```html
<script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
```

```javascript
function exportToExcel() {
  const ws = XLSX.utils.json_to_sheet(dealItems);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "עסקאות");
  XLSX.writeFile(wb, "deals.xlsx");
}
```

### 4. התראות בזמן אמת
```javascript
// הוסף subscriptions ל-Supabase:
const subscription = supabase
  .channel('deals-channel')
  .on('postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 'deals' },
    (payload) => {
      console.log('עסקה חדשה!', payload);
      showAlert('עסקה חדשה נוספה!', 'info');
    }
  )
  .subscribe();
```

### 5. גיבוי אוטומטי
בהגדרות Supabase:
- Settings → Database → Backups
- הפעל Daily Backups

### 6. דוחות ואנליטיקה
הוסף דשבורד עם סטטיסטיקות:
```sql
-- סה"כ עסקאות לפי סטטוס
SELECT deal_status, COUNT(*), SUM(final_amount)
FROM deals
GROUP BY deal_status;

-- לקוחות מובילים
SELECT c.business_name, COUNT(d.deal_id) as deal_count, SUM(d.final_amount) as total
FROM customers c
LEFT JOIN deals d ON c.customer_id = d.customer_id
GROUP BY c.customer_id
ORDER BY total DESC
LIMIT 10;
```

### 7. שליחת הצעות מחיר באימייל
```javascript
// שילוב עם SendGrid או EmailJS:
async function sendQuote(dealId) {
  const template = {
    to: customer.email,
    subject: 'הצעת מחיר',
    html: generateQuoteHTML(dealId)
  };
  
  // שלח דרך API
}
```

### 8. אפליקציית מובייל (PWA)
הוסף `manifest.json`:
```json
{
  "name": "CRM System",
  "short_name": "CRM",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#667eea",
  "theme_color": "#667eea",
  "icons": [
    {
      "src": "icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    }
  ]
}
```

---

## 🔧 פתרון בעיות נפוצות

### המוצרים לא נטענים
1. בדוק את ה-Console (F12)
2. וודא שה-URL וה-Key נכונים ב-`app.js`
3. בדוק ש-RLS מכובה או שיש מדיניות מתאימה

### שגיאת CORS
אם אתה רץ מקומית:
- השתמש ב-Live Server extension ב-VS Code
- או הרץ: `python3 -m http.server 8000`

### העיצוב לא נראה טוב
1. וודא שקובץ `styles.css` נטען
2. בדוק את ה-Network tab ב-DevTools
3. נקה cache (Ctrl+Shift+R)

---

## 📞 תמיכה נוספת

- [תיעוד Supabase](https://supabase.com/docs)
- [GitHub Pages Guide](https://pages.github.com/)
- [MDN Web Docs](https://developer.mozilla.org/)

---

**בהצלחה! 🚀**
