import SwiftUI

// MARK: - Color Palette
extension Color {
    static let orangePrimary = Color(hex: "#FF6C00")
    static let orangeLight = Color(hex: "#FF8C33")
    static let navyDark = Color(hex: "#0F172A")
    static let gray50 = Color(hex: "#F9FAFB")
    static let gray100 = Color(hex: "#F3F4F6")
    static let gray200 = Color(hex: "#E5E7EB")
    static let gray300 = Color(hex: "#D1D5DB")
    static let gray400 = Color(hex: "#9CA3AF")
    static let gray500 = Color(hex: "#6B7280")
    static let gray700 = Color(hex: "#374151")
    static let gray900 = Color(hex: "#111827")
    static let blueInfo = Color(hex: "#3B82F6")
    static let greenSuccess = Color(hex: "#22C55E")
    static let redDanger = Color(hex: "#EF4444")
    static let yellowWarning = Color(hex: "#F59E0B")
    static let purpleRelay = Color(hex: "#8B5CF6")

    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3:
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6:
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8:
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

// MARK: - Orange Gradient
extension LinearGradient {
    static let orangeGradient = LinearGradient(
        colors: [Color.orangePrimary, Color.orangeLight],
        startPoint: .leading,
        endPoint: .trailing
    )
    static let navyGradient = LinearGradient(
        colors: [Color.navyDark, Color(hex: "#1E293B")],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
}

// MARK: - Font
enum AppFont {
    static func regular(_ size: CGFloat) -> Font {
        .system(size: size, weight: .regular, design: .rounded)
    }
    static func medium(_ size: CGFloat) -> Font {
        .system(size: size, weight: .medium, design: .rounded)
    }
    static func semiBold(_ size: CGFloat) -> Font {
        .system(size: size, weight: .semibold, design: .rounded)
    }
    static func bold(_ size: CGFloat) -> Font {
        .system(size: size, weight: .bold, design: .rounded)
    }
    static func extraBold(_ size: CGFloat) -> Font {
        .system(size: size, weight: .heavy, design: .rounded)
    }
}

// MARK: - ViewModifiers
struct CardStyle: ViewModifier {
    var padding: CGFloat = 16
    func body(content: Content) -> some View {
        content
            .padding(padding)
            .background(Color.white)
            .cornerRadius(16)
            .shadow(color: Color.black.opacity(0.06), radius: 8, x: 0, y: 2)
    }
}

extension View {
    func cardStyle(padding: CGFloat = 16) -> some View {
        modifier(CardStyle(padding: padding))
    }
}
