const fs = require('fs');

function checkFile(path) {
    const content = fs.readFileSync(path, 'utf8');
    let openBraces = 0;
    let openParens = 0;
    let openBrackets = 0;
    
    for (let i = 0; i < content.length; i++) {
        if (content[i] === '{') openBraces++;
        if (content[i] === '}') openBraces--;
        if (content[i] === '(') openParens++;
        if (content[i] === ')') openParens--;
        if (content[i] === '[') openBrackets++;
        if (content[i] === ']') openBrackets--;
    }
    
    console.log(`File: ${path}`);
    console.log(`Braces: ${openBraces}`);
    console.log(`Parens: ${openParens}`);
    console.log(`Brackets: ${openBrackets}`);

    // Check for JSX tags
    const openTags = (content.match(/<[a-zA-Z0-9]+/g) || []).length;
    const closeTags = (content.match(/<\/[a-zA-Z0-9]+/g) || []).length;
    const selfClosing = (content.match(/\/>/g) || []).length;
    
    console.log(`Open Tags: ${openTags}`);
    console.log(`Close Tags: ${closeTags}`);
    console.log(`Self Closing: ${selfClosing}`);
    console.log(`Tag Balance: ${openTags - closeTags - selfClosing}`);
}

checkFile('src/components/AccountingView.tsx');
checkFile('src/components/InvoicesView.tsx');
checkFile('src/App.tsx');
