//
//  DesignSystem.swift
//  SkedenceAdmin
//
//  Created by Assistant on 12/29/25.
//

import SwiftUI
#if os(macOS)
import AppKit
#endif

// MARK: - Brand Colors
enum AppTheme {
    // Primary: Royal Blue (#3258A3)
    static let primary = Color(red: 0.196, green: 0.345, blue: 0.639)
    static let primaryDark = Color(red: 0.102, green: 0.169, blue: 0.427) // Deep Navy
    static let primaryLight = Color(red: 0.25, green: 0.45, blue: 0.75)
    
    // Secondary: Vibrant Orange (#F27121)
    static let secondary = Color(red: 0.949, green: 0.443, blue: 0.129)
    static let secondaryLight = Color(red: 0.976, green: 0.627, blue: 0.369) // Soft Orange
    
    // Accent: Deep Navy (#1A2B6D)
    static let accent = Color(red: 0.102, green: 0.169, blue: 0.427)
    
    // Silver Gray (#B1B3B6)
    static let silver = Color(red: 0.694, green: 0.702, blue: 0.714)
    
    // Neutrals - improved dark mode contrast
    static let textPrimary = Color.primary
    static let textSecondary = Color(light: Color.secondary, dark: Color(white: 0.7))
    static let textTertiary = Color(light: Color(white: 0.6), dark: Color(white: 0.5))
    static let border = Color(light: Color(UIColor.separator), dark: Color(white: 0.3))
    
    // Surface colors
    static let surfaceSecondary = Color(UIColor.secondarySystemBackground)
    
    // Status colors - better dark mode contrast
    static let success = Color(light: .green, dark: Color(red: 0.3, green: 0.85, blue: 0.4))
    static let warning = Color(light: .orange, dark: Color(red: 1.0, green: 0.7, blue: 0.3))
    static let error = Color(light: .red, dark: Color(red: 1.0, green: 0.4, blue: 0.4))
    static let info = Color(light: .blue, dark: Color(red: 0.4, green: 0.7, blue: 1.0))
    
    // Schedule specific - improved dark mode
    static let booked = Color(light: Color(red: 0.102, green: 0.169, blue: 0.427), dark: Color(red: 0.4, green: 0.6, blue: 0.95)) // Deep Navy
    static let available = Color(red: 0.196, green: 0.345, blue: 0.639) // Royal Blue
    static let unavailable = Color(red: 0.694, green: 0.702, blue: 0.714) // Silver Gray
}

// MARK: - Color Extension for Light/Dark Mode
extension Color {
    init(light: Color, dark: Color) {
        #if os(iOS) || os(tvOS) || os(watchOS) || os(visionOS)
        self.init(uiColor: UIColor(light: UIColor(light), dark: UIColor(dark)))
        #elseif os(macOS)
        self.init(nsColor: NSColor(name: nil) { appearance in
            appearance.bestMatch(from: [.darkAqua, .aqua]) == .darkAqua ? NSColor(dark) : NSColor(light)
        }!)
        #else
        self = light
        #endif
    }
}

#if os(iOS) || os(tvOS) || os(watchOS) || os(visionOS)
extension UIColor {
    convenience init(light: UIColor, dark: UIColor) {
        self.init { traitCollection in
            traitCollection.userInterfaceStyle == .dark ? dark : light
        }
    }
}
#endif

// MARK: - Typography
extension Font {
    static let displayLarge = Font.system(size: 40, weight: .bold, design: .rounded)
    static let displayMedium = Font.system(size: 32, weight: .bold, design: .rounded)
    static let displaySmall = Font.system(size: 28, weight: .bold, design: .rounded)
    
    static let headingLarge = Font.system(size: 24, weight: .semibold, design: .rounded)
    static let headingMedium = Font.system(size: 20, weight: .semibold, design: .rounded)
    static let headingSmall = Font.system(size: 18, weight: .semibold, design: .rounded)
    
    static let bodyLarge = Font.system(size: 17, weight: .regular, design: .default)
    static let bodyMedium = Font.system(size: 15, weight: .regular, design: .default)
    static let bodySmall = Font.system(size: 13, weight: .regular, design: .default)
    
    static let labelLarge = Font.system(size: 15, weight: .medium, design: .default)
    static let labelMedium = Font.system(size: 13, weight: .medium, design: .default)
    static let labelSmall = Font.system(size: 11, weight: .medium, design: .default)
}

// MARK: - Spacing
enum Spacing {
    static let xxs: CGFloat = 4
    static let xs: CGFloat = 8
    static let sm: CGFloat = 12
    static let md: CGFloat = 16
    static let lg: CGFloat = 20
    static let xl: CGFloat = 24
    static let xxl: CGFloat = 32
    static let xxxl: CGFloat = 40
}

// MARK: - Corner Radius
enum CornerRadius {
    static let xs: CGFloat = 8
    static let sm: CGFloat = 12
    static let md: CGFloat = 16
    static let lg: CGFloat = 20
    static let xl: CGFloat = 24
    static let round: CGFloat = 999
}

// MARK: - Shadows
extension View {
    func cardShadow() -> some View {
        self.shadow(color: .black.opacity(0.08), radius: 12, x: 0, y: 4)
    }
    
    func lightShadow() -> some View {
        self.shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 2)
    }
    
    func heavyShadow() -> some View {
        self.shadow(color: .black.opacity(0.12), radius: 16, x: 0, y: 6)
    }
}

// MARK: - Custom Button Styles
struct PrimaryButtonStyle: ButtonStyle {
    var isCompact: Bool = false
    
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(isCompact ? .labelLarge : .headingSmall)
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, isCompact ? Spacing.sm : Spacing.md)
            .background(
                RoundedRectangle(cornerRadius: CornerRadius.md, style: .continuous)
                    .fill(AppTheme.primary)
            )
            .scaleEffect(configuration.isPressed ? 0.97 : 1.0)
            .opacity(configuration.isPressed ? 0.9 : 1.0)
            .animation(.easeInOut(duration: 0.15), value: configuration.isPressed)
            .heavyShadow()
    }
}

struct SecondaryButtonStyle: ButtonStyle {
    var isCompact: Bool = false
    
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(isCompact ? .labelLarge : .headingSmall)
            .foregroundStyle(AppTheme.primary)
            .frame(maxWidth: .infinity)
            .padding(.vertical, isCompact ? Spacing.sm : Spacing.md)
            .background(
                RoundedRectangle(cornerRadius: CornerRadius.md, style: .continuous)
                    .fill(AppTheme.primary.opacity(0.12))
            )
            .scaleEffect(configuration.isPressed ? 0.97 : 1.0)
            .animation(.easeInOut(duration: 0.15), value: configuration.isPressed)
    }
}

struct DestructiveButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headingSmall)
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, Spacing.md)
            .background(
                RoundedRectangle(cornerRadius: CornerRadius.md, style: .continuous)
                    .fill(Color.red)
            )
            .scaleEffect(configuration.isPressed ? 0.97 : 1.0)
            .animation(.easeInOut(duration: 0.15), value: configuration.isPressed)
    }
}

// MARK: - Card View
struct CardView<Content: View>: View {
    let content: Content
    var padding: CGFloat = Spacing.md
    
    init(padding: CGFloat = Spacing.md, @ViewBuilder content: () -> Content) {
        self.padding = padding
        self.content = content()
    }
    
    var body: some View {
        content
            .padding(padding)
            .background(
                RoundedRectangle(cornerRadius: CornerRadius.md, style: .continuous)
                    .fill(Color(UIColor.systemBackground))
            )
            .cardShadow()
    }
}

// MARK: - Section Header
struct SectionHeaderView: View {
    let title: String
    var action: (() -> Void)? = nil
    var actionTitle: String = "See All"
    
    var body: some View {
        HStack(alignment: .firstTextBaseline) {
            Text(title)
                .font(.headingMedium)
                .foregroundStyle(AppTheme.textPrimary)
            
            Spacer()
            
            if let action = action {
                Button(action: action) {
                    Text(actionTitle)
                        .font(.labelMedium)
                        .foregroundStyle(AppTheme.primary)
                }
            }
        }
    }
}

// MARK: - Badge View
struct BadgeView: View {
    let text: String
    var color: Color = AppTheme.primary
    
    var body: some View {
        Text(text)
            .font(.labelSmall)
            .foregroundStyle(.white)
            .padding(.horizontal, Spacing.xs)
            .padding(.vertical, Spacing.xxs)
            .background(
                Capsule()
                    .fill(color)
            )
    }
}

// MARK: - Empty State View
struct EmptyStateView: View {
    let icon: String
    let title: String
    let message: String
    var action: (() -> Void)? = nil
    var actionTitle: String = "Get Started"
    
    var body: some View {
        VStack(spacing: Spacing.lg) {
            Image(systemName: icon)
                .font(.system(size: 60))
                .foregroundStyle(AppTheme.primary.opacity(0.6))
            
            VStack(spacing: Spacing.xs) {
                Text(title)
                    .font(.headingMedium)
                    .foregroundStyle(AppTheme.textPrimary)
                
                Text(message)
                    .font(.bodyMedium)
                    .foregroundStyle(AppTheme.textSecondary)
                    .multilineTextAlignment(.center)
            }
            
            if let action = action {
                Button(action: action) {
                    Text(actionTitle)
                }
                .buttonStyle(PrimaryButtonStyle(isCompact: true))
                .padding(.horizontal, Spacing.xxxl)
            }
        }
        .padding(Spacing.xxxl)
    }
}

// MARK: - Platform Colors
extension Color {
    static var platformBackground: Color {
        #if os(iOS) || os(tvOS) || os(watchOS) || os(visionOS)
        return Color(UIColor.systemBackground)
        #elseif os(macOS)
        return Color(NSColor.windowBackgroundColor)
        #else
        return Color.white
        #endif
    }
    
    static var platformGroupedBackground: Color {
        #if os(iOS) || os(tvOS) || os(watchOS) || os(visionOS)
        return Color(UIColor.systemGroupedBackground)
        #elseif os(macOS)
        return Color(NSColor.underPageBackgroundColor)
        #else
        return Color.gray.opacity(0.06)
        #endif
    }
}

// MARK: - Keyboard Dismiss Toolbar
extension View {
    func keyboardDismissToolbar() -> some View {
        self.toolbar {
            ToolbarItemGroup(placement: .keyboard) {
                Spacer()
                Button {
                    hideKeyboard()
                } label: {
                    Image(systemName: "chevron.down")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(AppTheme.primary)
                }
            }
        }
    }
    
    func hideKeyboard() {
        #if os(iOS)
        UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
        #endif
    }
}
