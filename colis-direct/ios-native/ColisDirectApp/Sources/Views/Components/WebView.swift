import SwiftUI
import WebKit

struct WebView: UIViewRepresentable {
    let url: URL
    var onNavigationStateChange: ((URL) -> Void)? = nil

    func makeUIView(context: Context) -> WKWebView {
        let webView = WKWebView()
        webView.navigationDelegate = context.coordinator
        
        // Configure standard WKWebView options
        webView.allowsBackForwardNavigationGestures = true
        webView.customUserAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148"
        
        let request = URLRequest(url: url)
        webView.load(request)
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    class Coordinator: NSObject, WKNavigationDelegate {
        var parent: WebView

        init(_ parent: WebView) {
            self.parent = parent
        }

        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            if let url = navigationAction.request.url {
                parent.onNavigationStateChange?(url)
            }
            decisionHandler(.allow)
        }
    }
}
