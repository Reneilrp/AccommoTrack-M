const fs = require('fs');

function patchWebDormProfile() {
    const file = '../frontend/AccommoTrackWeb/src/screens/Landlord/DormProfileSettings.jsx';
    let content = fs.readFileSync(file, 'utf8');
    
    // Add default values
    if(!content.includes('normal_booking_limit: data.normal_booking_limit')) {
        content = content.replace(
            /(allow_partial_payments:\s*parseBooleanFlag\(data\.allow_partial_payments,\s*true\),)/g,
            "$1\n        normal_booking_limit: data.normal_booking_limit ?? 1,\n        proxy_booking_limit: data.proxy_booking_limit ?? 3,\n        min_partial_payment_pct: data.min_partial_payment_pct ?? 20,"
        );
    }
    
    // API request body
    if(!content.includes('normal_booking_limit: parseInt(dormData.normal_booking_limit)')) {
        content = content.replace(
            /(allow_partial_payments:\s*dormData\.allow_partial_payments\s*\?\s*1\s*:\s*0,)/g,
            "$1\n        normal_booking_limit: parseInt(dormData.normal_booking_limit) || 1,\n        proxy_booking_limit: parseInt(dormData.proxy_booking_limit) || 3,\n        min_partial_payment_pct: parseInt(dormData.min_partial_payment_pct) || 20,"
        );
    }
    
    // Add UI fields
    const newUI = `
                       {/* Booking Limits & Partial Minimum */}
                       <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
                          <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-1">
                            Normal Booking Limit (per property)
                          </label>
                          <input
                            type="number"
                            min="1" max="4"
                            value={dormData.normal_booking_limit || 1}
                            onChange={(e) => handleInputChange('normal_booking_limit', e.target.value)}
                            className="w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-lg p-2.5 transition focus:ring-green-500 focus:border-green-500"
                          />
                       </div>
                       <div className="mt-4">
                          <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-1">
                            Proxy Booking Limit (per property)
                          </label>
                          <input
                            type="number"
                            min="1" max="4"
                            value={dormData.proxy_booking_limit || 3}
                            onChange={(e) => handleInputChange('proxy_booking_limit', e.target.value)}
                            className="w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-lg p-2.5 transition focus:ring-green-500 focus:border-green-500"
                          />
                       </div>
                       
                       <div className="mt-4 mb-4">
                          <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-1">
                            Minimum Partial Payment (%)
                          </label>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                             Minimum percentage a tenant can pay if partial payments are allowed.
                          </p>
                          <input
                            type="number"
                            min="1" max="100"
                            value={dormData.min_partial_payment_pct || 20}
                            onChange={(e) => handleInputChange('min_partial_payment_pct', e.target.value)}
                            className="w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-lg p-2.5 transition focus:ring-green-500 focus:border-green-500"
                            disabled={dormData.allow_partial_payments === false}
                          />
                       </div>
    `;
    
    if(!content.includes('Normal Booking Limit')) {
        content = content.replace(
            /(<div className="flex flex-col">\s*<span className="text-sm font-medium[^>]+>\s*Allow Partial Payments\s*<\/span>\s*<span[^>]+>\s*If enabled, tenants can pay their invoice balance in smaller increments[^<]+<\/span>\s*<\/div>\s*<\/label>)/,
            "$1\n" + newUI
        );
    }
    
    fs.writeFileSync(file, content);
}
patchWebDormProfile();
