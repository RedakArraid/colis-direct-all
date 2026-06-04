import SwiftUI

// MARK: - Splash Screen
struct SplashView: View {
    @State private var scale: CGFloat = 0.6
    @State private var opacity: Double = 0

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color.navyDark, Color(hex: "#1E293B")],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            VStack(spacing: 20) {
                ZStack {
                    RoundedRectangle(cornerRadius: 20)
                        .fill(Color.orangePrimary)
                        .frame(width: 80, height: 80)

                    Image(systemName: "shippingbox.fill")
                        .font(.system(size: 36))
                        .foregroundColor(.white)
                }
                .shadow(color: Color.orangePrimary.opacity(0.5), radius: 20, x: 0, y: 8)

                VStack(spacing: 6) {
                    Text("COLISDIRECT")
                        .font(.system(size: 28, weight: .heavy, design: .rounded))
                        .foregroundColor(.white)
                        .kerning(-0.5)

                    Text("Côte d'Ivoire")
                        .font(AppFont.medium(15))
                        .foregroundColor(.white.opacity(0.6))
                }

                ProgressView()
                    .tint(Color.orangePrimary)
                    .padding(.top, 16)
            }
            .scaleEffect(scale)
            .opacity(opacity)
        }
        .onAppear {
            withAnimation(.spring(response: 0.6, dampingFraction: 0.7)) {
                scale = 1.0
                opacity = 1.0
            }
        }
    }
}
