
const fs = require('fs');

function extractUnusedVars(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    // Find the first [ and the last ] to extract the JSON array
    const start = content.indexOf('[');
    const end = content.lastIndexOf(']');
    if (start === -1 || end === -1) return [];
    
    const jsonStr = content.substring(start, end + 1);
    try {
        const data = JSON.parse(jsonStr);
        const results = [];
        data.forEach(file => {
            file.messages.forEach(msg => {
                if (msg.ruleId === 'no-unused-vars') {
                    // Extract variable name from message if possible, or use the range
                    // Message usually looks like "'isDarkMode' is assigned a value but never used."
                    const match = msg.message.match(/'([^']+)'/);
                    const varName = match ? match[1] : null;
                    results.push({
                        filePath: file.filePath,
                        line: msg.line,
                        column: msg.column,
                        varName: varName,
                        endLine: msg.endLine,
                        endColumn: msg.endColumn
                    });
                }
            });
        });
        return results;
    } catch (e) {
        console.error("Error parsing " + filePath, e);
        return [];
    }
}

const mobileResults = extractUnusedVars('mobile_lint.json');
const webResults = extractUnusedVars('web_lint.json');

console.log(JSON.stringify({ mobile: mobileResults, web: webResults }, null, 2));
