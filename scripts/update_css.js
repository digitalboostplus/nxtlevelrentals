const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, '../styles/globals.css');
let css = fs.readFileSync(cssPath, 'utf8');

// Font replacement
css = css.replace(/Poppins/g, 'Manrope');

// Variables
// Old Primary: #0f766e -> New Primary: #137fec
css = css.replace(/#0f766e/g, '#137fec');
// Old rgb: 15, 118, 110 -> New rgb: 19, 127, 236
css = css.replace(/15, 118, 110/g, '19, 127, 236');

// Old Secondary: #14b8a6 -> New Secondary: #0f62b8
css = css.replace(/#14b8a6/g, '#0f62b8');
// Old rgb: 20, 184, 166 -> New rgb: 15, 98, 184
css = css.replace(/20, 184, 166/g, '15, 98, 184');

// Old Accent: #0369a1 -> New Accent: #2999ff
css = css.replace(/#0369a1/g, '#2999ff');
// Old rgb: 3, 105, 161 -> New rgb: 41, 153, 255
css = css.replace(/3, 105, 161/g, '41, 153, 255');

// Border Radius
css = css.replace(/--radius-sm: 10px;/g, '--radius-sm: 8px;');
css = css.replace(/--radius-md: 14px;/g, '--radius-md: 12px;');
css = css.replace(/--radius-lg: 18px;/g, '--radius-lg: 16px;');
css = css.replace(/--radius-xl: 24px;/g, '--radius-xl: 20px;');

fs.writeFileSync(cssPath, css);
console.log('CSS updated successfully.');
