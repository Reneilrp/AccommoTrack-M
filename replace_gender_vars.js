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

    // Remaining variable/function replacements
    content = content.replace(/genderPolicy/g, 'sexPolicy');
    content = content.replace(/gender_policy/g, 'sex_policy');
    content = content.replace(/tenantGender/g, 'tenantSex');
    content = content.replace(/occupantGender/g, 'occupantSex');
    content = content.replace(/propertyGender/g, 'propertySex');
    content = content.replace(/defaultGender/g, 'defaultSex');
    content = content.replace(/EligibleGender/g, 'EligibleSex');
    content = content.replace(/GenderCompatible/g, 'SexCompatible');
    content = content.replace(/is_gender_compatible/g, 'is_sex_compatible');

    if (content !== original) {
        fs.writeFileSync(filePath, content);
        console.log('Updated vars:', filePath);
    }
}

walkDir('backend/app', replaceInFile);
walkDir('backend/resources', replaceInFile);
walkDir('frontend/AccommoTrackWeb/src', replaceInFile);
walkDir('frontend/AccommoTrackMobile/src', replaceInFile);

