const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        if (dirPath.includes('node_modules') || dirPath.includes('vendor') || dirPath.includes('.git') || dirPath.includes('dist') || dirPath.includes('.expo')) return;
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
    });
}

function replaceInFile(filePath) {
    if (!filePath.match(/\.(php|js|jsx|ts|tsx)$/)) return;
    let content = fs.readFileSync(filePath, 'utf-8');
    let original = content;

    // Room restriction
    content = content.replace(/gender_restriction/g, 'sex_restriction');
    content = content.replace(/genderRestriction/g, 'sexRestriction');
    content = content.replace(/GenderRestriction/g, 'SexRestriction');

    // General replacements
    content = content.replace(/\bgender\b/g, 'sex');
    content = content.replace(/\bGender\b/g, 'Sex');
    content = content.replace(/\bGENDER\b/g, 'SEX');
    
    // Normalize enums for sex specifically to avoid bad regex match errors
    content = content.replace(/'rather_not_say',\s*'prefer_not_to_say',\s*'other'\s*=>\s*'rather_not_say',/g, '');
    
    // Clean rules inside Arrays:
    content = content.replace(/,\s*'rather_not_say',\s*'prefer_not_to_say',\s*'other'/g, '');
    content = content.replace(/'rather_not_say',\s*'prefer_not_to_say',\s*'other'\s*,?/g, '');
    
    // Remaining ones
    content = content.replace(/,\s*'rather_not_say'/g, '');
    content = content.replace(/,\s*'prefer_not_to_say'/g, '');
    content = content.replace(/,\s*'other'/g, '');
    content = content.replace(/'rather_not_say'\s*,?/g, '');
    content = content.replace(/'prefer_not_to_say'\s*,?/g, '');
    content = content.replace(/'other'\s*,?/g, '');

    // Cleanup Rule::in
    content = content.replace(/Rule::in\(\[\s*'male',\s*'female',\s*\]\)/g, "Rule::in(['male', 'female'])");
    content = content.replace(/oneOf\(\[\s*'male',\s*'female',\s*\]\)/g, "oneOf(['male', 'female'])");

    if (content !== original) {
        fs.writeFileSync(filePath, content);
        console.log('Updated:', filePath);
    }
}

walkDir('backend/app', replaceInFile);
walkDir('backend/config', replaceInFile);
walkDir('backend/routes', replaceInFile);
walkDir('backend/database', replaceInFile);
walkDir('backend/tests', replaceInFile);

walkDir('frontend/AccommoTrackWeb/src', replaceInFile);
walkDir('frontend/AccommoTrackMobile/app', replaceInFile);
walkDir('frontend/AccommoTrackMobile/src', replaceInFile);
walkDir('frontend/AccommoTrackMobile/components', replaceInFile);
walkDir('frontend/AccommoTrackMobile/constants', replaceInFile);

