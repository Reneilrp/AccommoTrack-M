<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class PaymongoTokenizeController extends Controller
{
    /**
     * Serve a simple hosted tokenization page for client-side card tokenization.
     * This page is intentionally minimal and contains instructions/placeholders
     * where the PayMongo client-side integration should be added.
     *
     * Query params:
     * - return_url: (optional) url to redirect after tokenization (for browser flow)
     */
    public function show(Request $request, $invoiceId)
    {
        $publicKey = env('PAYMONGO_PUBLIC');
        $returnUrl = $request->query('return_url', 'about:blank');

        // Build the HTML without using PHP string interpolation to avoid deprecation warnings
        $html = '<!doctype html>' .
            '<html>' .
            '<head>' .
            '<meta charset="utf-8" />' .
            '<meta name="viewport" content="width=device-width,initial-scale=1" />' .
            '<title>PayMongo Tokenize</title>' .
            '<style>' .
            'body { font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; padding: 20px; }' .
            '.card { max-width: 520px; margin: 0 auto; }' .
            'label { display:block; margin-top:12px; font-size:14px; color:#333 }' .
            'input { width:100%; padding:10px; margin-top:6px; border:1px solid #ddd; border-radius:6px }' .
            'button { margin-top:16px; padding:12px 16px; background:#10B981; color:#fff; border:none; border-radius:8px; font-weight:700 }' .
            '.note { margin-top:12px; color:#6b7280; font-size:13px }' .
            '</style>' .
            '</head>' .
            '<body>' .
            '<div class="card">' .
            '<h2>Pay with Card</h2>' .
            '<p class="note">This page should tokenize the card using PayMongo\'s client-side APIs and return a <code>payment_method_id</code> to the mobile app via <code>window.ReactNativeWebView.postMessage()</code> (for WebView) or redirect to the provided <code>return_url</code> with the token as a query param.</p>' .
            '<div>' .
            '<label>Card Number</label>' .
            '<input id="card_number" placeholder="4242424242424242" />' .
            '<label>Exp Month</label>' .
            '<input id="exp_month" placeholder="MM" />' .
            '<label>Exp Year</label>' .
            '<input id="exp_year" placeholder="YYYY" />' .
            '<label>CVC</label>' .
            '<input id="cvc" placeholder="CVC" />' .
            '<button id="tokenize">Tokenize card (demo placeholder)</button>' .
            '<p class="note">Public Key: <code>' . htmlspecialchars($publicKey) . '</code></p>' .
            '</div>' .
            '<script>' .
            'const invoiceId = ' . json_encode(intval($invoiceId)) . ';' .
            'const returnUrl = ' . json_encode($returnUrl) . ';' .
            'document.getElementById("tokenize").addEventListener("click", async function() {' .
            '  const cardNumber = document.getElementById("card_number").value || "4242424242424242";' .
            '  const fakeToken = "pm_demo_" + btoa(cardNumber + Date.now());' .
            '  if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {' .
            '    window.ReactNativeWebView.postMessage(JSON.stringify({ payment_method_id: fakeToken }));' .
            '    return;' .
            '  }' .
            '  const next = returnUrl + (returnUrl.indexOf("?") === -1 ? "?" : "&") + "payment_method_id=" + encodeURIComponent(fakeToken) + "&invoice_id=" + encodeURIComponent(invoiceId);' .
            '  window.location.href = next;' .
            '});' .
            '</script>' .
            '</div>' .
            '</body>' .
            '</html>';

        return response($html, 200)->header('Content-Type', 'text/html');
    }
}
