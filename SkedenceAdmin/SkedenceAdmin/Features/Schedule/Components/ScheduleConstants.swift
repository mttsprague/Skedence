//
//  ScheduleConstants.swift
//  SkedenceAdmin
//
//  Shared layout constants for schedule views
//

import Foundation
import CoreGraphics

enum ScheduleConstants {
    /// Standard row height for schedule cells
    static let rowHeight: CGFloat = 56
    
    /// Vertical padding between rows
    static let rowVerticalPadding: CGFloat = 1
    
    /// Width of the time column (hour labels)
    static let timeColWidth: CGFloat = 44
    
    /// Width of the time column in trainer week view (slightly wider)
    static let timeColWidthWide: CGFloat = 56
    
    /// Width of day columns in week view
    static let dayColumnWidth: CGFloat = 47
    
    /// Spacing between columns
    static let columnSpacing: CGFloat = 0
    
    /// Horizontal padding per cell
    static let horizontalPaddingPerCell: CGFloat = 2
    
    /// Visible hours range (6am - 11pm, last slot ends at 12am)
    static let visibleHours: [Int] = Array(6...23)
}
