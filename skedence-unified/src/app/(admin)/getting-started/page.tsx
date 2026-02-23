'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  CreditCard,
  Settings,
  FileText,
  MapPin,
  Calendar,
  Users,
  UserPlus,
  DollarSign,
  Shield,
  Mail,
  CheckCircle2,
  Search,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Zap,
  BarChart3,
  Clock,
  MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface GuideSection {
  id: string;
  title: string;
  icon: any;
  order: number;
  category: 'essential' | 'setup' | 'daily' | 'advanced';
  subsections: {
    id: string;
    title: string;
    content: string;
    steps?: string[];
    tips?: string[];
    faq?: { q: string; a: string }[];
  }[];
}

const guideSections: GuideSection[] = [
  {
    id: 'stripe',
    title: 'Connect Stripe Payments',
    icon: CreditCard,
    order: 1,
    category: 'essential',
    subsections: [
      {
        id: 'stripe-overview',
        title: 'Why Connect Stripe?',
        content: 'Stripe is your payment processor. When clients purchase lesson packages through the Skedence app, the money goes directly into your Stripe account (minus a small 5% platform fee). You\'ll need a Stripe account to accept payments and run your business.',
        tips: [
          'Stripe is free to set up - you only pay per transaction (2.9% + 30¢)',
          'Money typically arrives in your bank account within 2 business days',
          'All payment data is encrypted and PCI compliant',
          'You can view all transactions in your Stripe dashboard'
        ]
      },
      {
        id: 'stripe-setup',
        title: 'How to Connect Stripe',
        content: 'Setting up Stripe takes about 5 minutes and requires your business information and bank account details.',
        steps: [
          'Navigate to **Business Settings → Stripe** in the left sidebar',
          'Click the **"Connect Stripe Account"** button',
          'You\'ll be redirected to Stripe\'s secure website',
          'Choose **"Create a new account"** (or sign in if you already have one)',
          'Fill in your business information: business name, type, address',
          'Add your personal details: name, date of birth, SSN (for identity verification)',
          'Enter your bank account information where you want to receive payments',
          'Review and submit for approval',
          'Stripe will verify your information (usually instant, sometimes 1-2 days)',
          'Once approved, you\'ll be redirected back to Skedence',
          'You\'ll see a ✅ green checkmark confirming your account is connected'
        ],
        tips: [
          'Have your EIN or SSN ready for faster setup',
          'Use your business bank account, not personal',
          'Make sure your business name matches your legal documents',
          'You can update your bank account later in the Stripe dashboard'
        ],
        faq: [
          {
            q: 'What if I don\'t have a business entity yet?',
            a: 'You can use your personal information and select "Individual" as your business type. You can always upgrade to a business entity later.'
          },
          {
            q: 'How much does Stripe charge?',
            a: 'Stripe charges 2.9% + 30¢ per transaction. Skedence charges an additional 5% platform fee. For example, if a client pays $100, Stripe takes $3.20, Skedence takes $5, and you receive $91.80.'
          },
          {
            q: 'When will I receive payments?',
            a: 'Stripe deposits funds to your bank account on a rolling 2-day basis. For example, payments from Monday arrive Wednesday, Tuesday arrives Thursday, etc.'
          },
          {
            q: 'Can I change my connected account later?',
            a: 'Yes, but it requires disconnecting your current account first. Contact support for assistance with this process.'
          }
        ]
      }
    ]
  },
  {
    id: 'business-settings',
    title: 'Business Settings',
    icon: Settings,
    order: 2,
    category: 'essential',
    subsections: [
      {
        id: 'organization-info',
        title: 'Organization Information',
        content: 'Your organization name and branding appear throughout the client and trainer apps. This is how clients will identify your business.',
        steps: [
          'Go to **Business Settings → Organization**',
          'Set your organization name (e.g., "Elite Training Center")',
          'Upload your logo (optional but recommended)',
          'Choose your primary brand color - this colors buttons and accents in the mobile apps',
          'Save your changes'
        ],
        tips: [
          'Your organization name appears in booking confirmations and receipts',
          'Logo should be square (minimum 500x500px) for best results',
          'Choose a brand color that contrasts well with white text',
          'You can change these settings anytime'
        ]
      },
      {
        id: 'waivers',
        title: 'Digital Waivers',
        content: 'Waivers legally protect your business by having clients acknowledge risks before training. Skedence provides built-in digital waiver signing with e-signatures.',
        steps: [
          'Navigate to **Business Settings → Waivers**',
          'Toggle **"Require Waiver"** to ON',
          'Choose waiver type: **Activity Waiver** (most common) or **Custom**',
          'If using Activity Waiver, review the default text - it covers general liability',
          'If using Custom, paste your own waiver text',
          'Customize the introductory text shown to clients',
          'Save your changes',
          'Clients will be prompted to sign the waiver on their first app login',
          'Signed waivers are stored as PDFs in Firebase Storage'
        ],
        tips: [
          'Consult with a lawyer to ensure your waiver meets local requirements',
          'The Activity Waiver template covers most training scenarios',
          'Clients cannot book sessions until they sign the waiver',
          'Signed waivers include timestamp, signature, and IP address',
          'You can download signed waivers from the client detail page'
        ],
        faq: [
          {
            q: 'Where are signed waivers stored?',
            a: 'Signed waivers are automatically generated as PDFs and stored in Firebase Storage. Each client has their own waiver document that includes their signature, date signed, and your business information.'
          },
          {
            q: 'Can I require clients to sign a new waiver?',
            a: 'Yes. If you make changes to your waiver text, you can require all clients to re-sign. Contact support to reset waiver status for all clients.'
          },
          {
            q: 'What if a client is under 18?',
            a: 'The waiver system allows for parent/guardian signatures. The client enters the parent\'s name, and the waiver PDF shows this relationship.'
          },
          {
            q: 'Are digital signatures legally binding?',
            a: 'Yes, in the United States and most countries, digital signatures are legally binding under the E-Sign Act (2000). The waiver includes timestamp and IP address for additional verification.'
          }
        ]
      },
      {
        id: 'intake-forms',
        title: 'Intake Forms',
        content: 'Intake forms collect important information from new clients during signup. This helps you understand their goals, medical history, and experience level before their first session.',
        steps: [
          'Go to **Business Settings → Intake Forms**',
          'Toggle **"Require Intake Form"** to ON',
          'Click **"+ Add Question"** to create custom questions',
          'For each question, choose the type:',
          '  • **Text** - Short text answer',
          '  • **Long Text** - Paragraph response',
          '  • **Multiple Choice** - Radio buttons',
          '  • **Checkboxes** - Multiple selections',
          '  • **Number** - Numeric input',
          '  • **Date** - Date picker',
          'Mark questions as **Required** or **Optional**',
          'Drag questions to reorder them',
          'Save your form',
          'Clients fill out the form during their first app login'
        ],
        tips: [
          'Common questions: fitness goals, injury history, emergency contact, experience level',
          'Keep forms under 10 questions - shorter forms have higher completion rates',
          'Group similar questions together (e.g., all medical questions)',
          'Use required fields for critical information only',
          'You can view client responses on their profile page'
        ],
        faq: [
          {
            q: 'Can I edit the form after clients have submitted responses?',
            a: 'Yes, you can add new questions or edit existing ones. However, clients who already submitted won\'t be prompted to answer new questions unless you reset their form status.'
          },
          {
            q: 'Where are the responses stored?',
            a: 'Intake form responses are stored in Firestore and displayed on each client\'s profile page. Only you and your trainers can see these responses.'
          },
          {
            q: 'What should I ask in my intake form?',
            a: 'Essential questions: goals, injuries/conditions, emergency contact, experience level. Optional: preferred training times, dietary restrictions, how they found you.'
          }
        ]
      },
      {
        id: 'locations',
        title: 'Training Locations',
        content: 'Locations are where training sessions happen - your gym, outdoor spaces, client homes, etc. Locations help organize your schedule and provide GPS directions to clients.',
        steps: [
          'Navigate to **Business Settings → Locations**',
          'Click **"+ Add Location"** button',
          'Enter location details:',
          '  • **Name**: e.g., "Main Gym", "Outdoor Field", "Mobile Training"',
          '  • **Address**: Full street address (enables GPS navigation)',
          '  • **Description**: Additional details or parking instructions',
          '  • **Active**: Toggle to show/hide this location',
          'Save the location',
          'When trainers create availability slots, they select a location',
          'Clients see the location name and address when booking',
          'Mobile apps provide GPS directions to the location'
        ],
        tips: [
          'Add multiple locations if you train at different facilities',
          'Use descriptive names: "Downtown Studio - Room A" instead of just "Studio"',
          'Include parking instructions in the description',
          'For mobile training, create a location called "Mobile" with your service area',
          'You can archive old locations instead of deleting them'
        ],
        faq: [
          {
            q: 'Can I have multiple locations?',
            a: 'Yes, create as many locations as you need. Each trainer can create availability at different locations.'
          },
          {
            q: 'What if I train at client homes?',
            a: 'Create a location called "Client Location" or "Mobile Training" without a specific address. You can add notes to individual bookings with the actual address.'
          },
          {
            q: 'Can clients filter availability by location?',
            a: 'Yes, the client app allows filtering available time slots by location, trainer, and date.'
          }
        ]
      },
      {
        id: 'notifications',
        title: 'Email Notifications',
        content: 'Automated email notifications keep you and your clients informed about bookings, cancellations, and package purchases.',
        steps: [
          'Go to **Business Settings → Notifications**',
          'Configure booking notifications:',
          '  • **Booking Confirmation** - Sent when client books a session',
          '  • **Booking Cancellation** - Sent when a booking is cancelled',
          '  • **Booking Reminder** - Sent 24 hours before session',
          '  • **Package Purchase** - Sent when client buys a package',
          'Toggle each notification type ON/OFF',
          'Choose recipients: Client Only, Trainer Only, or Both',
          'Customize email templates (optional)',
          'Save your preferences'
        ],
        tips: [
          'Start with all notifications enabled - you can always turn them off',
          '24-hour booking reminders reduce no-shows significantly',
          'Clients expect confirmation emails - don\'t disable these',
          'Email templates use your organization name and branding'
        ]
      }
    ]
  },
  {
    id: 'pricing',
    title: 'Set Your Pricing',
    icon: DollarSign,
    order: 3,
    category: 'essential',
    subsections: [
      {
        id: 'pricing-structure',
        title: 'Understanding Pricing Structure',
        content: 'Skedence uses a flexible pricing system with Tiers and Packages. Tiers group related packages (e.g., "Standard", "Premium"). Packages are the actual products clients can purchase (e.g., "10 Private Lessons").',
        tips: [
          'Most businesses start with 2-3 tiers: Standard, Premium, Elite',
          'Packages within a tier often target different group sizes',
          'Higher tiers typically offer lower per-session rates',
          'You can offer unlimited pricing tiers and packages'
        ]
      },
      {
        id: 'creating-packages',
        title: 'Creating Your Packages',
        content: 'Packages are bundles of lessons that clients purchase. Each package has a price, number of sessions, lesson type, and expiration.',
        steps: [
          'Go to **Business Settings → Pricing**',
          'Click **"+ Add Tier"** to create a tier (e.g., "Standard")',
          'Within the tier, click **"+ Add Package"**',
          'Enter package details:',
          '  • **Title**: e.g., "10 Private Lessons - 1 Athlete"',
          '  • **Price**: e.g., $800.00',
          '  • **Package Type**: Choose from dropdown or create custom',
          '  • **Package Category**: Select athlete count (1, 2, 3, 4 athletes) or Class',
          '  • **Lesson Count**: Number of sessions included (e.g., 10)',
          '  • **Description**: Optional details about the package',
          'Save the package',
          'Create additional packages for different group sizes',
          'Create additional tiers for different pricing levels',
          'Your prices appear immediately in the mobile apps'
        ],
        tips: [
          'Common packages: 1, 5, 10, 20 session bundles',
          'Offer discounts for larger packages (e.g., 20% off for 20 sessions)',
          'Semi-private (2 athletes) = 1.5x-1.7x the single athlete price',
          'Small group (3-4 athletes) = 2x-2.5x the single athlete price',
          'Class passes are typically lower price per session but higher volume',
          'Use clear titles: "10 Private Sessions - 1 Athlete" is better than "Standard Package"'
        ],
        faq: [
          {
            q: 'Can I change prices after clients have purchased?',
            a: 'Yes, price changes only affect new purchases. Existing client packages keep their original price.'
          },
          {
            q: 'Do packages expire?',
            a: 'Currently packages don\'t auto-expire, but you can manually archive packages or mark them as inactive. Expiration features are coming in a future update.'
          },
          {
            q: 'What\'s the difference between package type and category?',
            a: 'Package type is a unique identifier (e.g., "private_10_pack"). Category defines the lesson format (1 athlete, 2 athletes, etc.) and affects how bookings work.'
          },
          {
            q: 'Can I hide packages temporarily?',
            a: 'Yes, delete the package from the tier. It won\'t appear in the client app but existing client packages remain valid.'
          },
          {
            q: 'How do I handle different pricing for different trainers?',
            a: 'Create different tiers for each trainer level: "Tier 1 - Junior Trainer", "Tier 2 - Lead Trainer", "Tier 3 - Master Trainer". Clients see all tiers and choose which to purchase from.'
          }
        ]
      },
      {
        id: 'package-best-practices',
        title: 'Pricing Best Practices',
        content: 'Strategic pricing can significantly impact your revenue and client retention.',
        tips: [
          '**Bundle Discount**: Offer 10-15% discount on 10-session packages, 20-25% on 20-session packages',
          '**Entry Point**: Always have a low-commitment option (1 or 3 sessions) for new clients',
          '**Sweet Spot**: 10-session packages are the most popular - price these competitively',
          '**Premium Tier**: Create a "VIP" or "Platinum" tier with added perks (priority scheduling, nutrition guidance)',
          '**Group Discounts**: Semi-private should be 40-60% more than private (split between 2 people = savings)',
          '**Class Pricing**: Class passes per-session should be 40-60% of private session rate',
          '**Round Numbers**: Use $100, $150, $200 instead of $99, $149, $199 - looks more professional',
          '**Test**: Start with your prices, then adjust based on conversion rates and feedback'
        ]
      }
    ]
  },
  {
    id: 'scheduling',
    title: 'Setting Up Scheduling',
    icon: Calendar,
    order: 4,
    category: 'setup',
    subsections: [
      {
        id: 'availability-overview',
        title: 'How Scheduling Works',
        content: 'Trainers create "availability slots" in their calendar. These slots appear in the client app as bookable time slots. When a client books, the slot becomes a confirmed booking.',
        tips: [
          'Availability = open time slots trainers create',
          'Bookings = confirmed sessions with a specific client',
          'Clients can only book available slots',
          'You can create recurring availability or one-time slots'
        ]
      },
      {
        id: 'creating-availability',
        title: 'Creating Availability Slots',
        content: 'Set your weekly schedule by creating availability slots for when you\'re ready to train clients.',
        steps: [
          'Navigate to **Scheduling → Schedule** (calendar icon)',
          'Click the **"+ Add Availability"** button',
          'Fill in the slot details:',
          '  • **Trainer**: Select who is available (defaults to you)',
          '  • **Date**: Choose the date',
          '  • **Start Time**: When the slot begins',
          '  • **End Time**: When the slot ends',
          '  • **Location**: Where training happens',
          '  • **Notes**: Optional internal notes',
          'Choose recurrence:',
          '  • **One-time**: Single slot for that date',
          '  • **Daily**: Repeats every day',
          '  • **Weekly**: Repeats every week on same day',
          '  • **Custom**: Choose specific days of week',
          'Set end recurrence date (or leave blank for indefinite)',
          'Click **"Create"**',
          'Your availability now appears in the client app'
        ],
        tips: [
          'Create your standard weekly schedule first (e.g., Mon-Fri 6am-8pm)',
          'Use 60-minute slots for most sessions',
          'Block out lunch breaks by NOT creating slots during that time',
          'For small group classes, create longer slots (75-90 minutes)',
          'You can always delete or edit slots later',
          'Clients see all available slots across all trainers'
        ],
        faq: [
          {
            q: 'How far in advance should I create availability?',
            a: 'Create at least 2-4 weeks of availability. Use recurring slots to automatically populate future weeks.'
          },
          {
            q: 'Can clients see my entire schedule?',
            a: 'No, clients only see available (unbooked) slots. They cannot see your booked sessions or blocked time.'
          },
          {
            q: 'What happens to recurring slots if I delete one?',
            a: 'Deleting a single instance removes only that slot. Deleting the series removes all future instances. Past slots are never deleted.'
          },
          {
            q: 'Can I create availability for multiple trainers at once?',
            a: 'Not yet - each trainer\'s availability must be created separately. This feature is planned for a future update.'
          }
        ]
      },
      {
        id: 'managing-bookings',
        title: 'Managing Bookings',
        content: 'When clients book sessions, they appear in your bookings list and on the calendar. You can view, reschedule, or cancel bookings.',
        steps: [
          'View all bookings: **Scheduling → Bookings**',
          'Filter by:',
          '  • Date range (today, this week, this month)',
          '  • Trainer',
          '  • Status (upcoming, completed, cancelled)',
          'Click a booking to see details:',
          '  • Client information',
          '  • Package being used',
          '  • Location and time',
          '  • Notes',
          'Actions you can take:',
          '  • **Reschedule**: Move to a different time slot',
          '  • **Cancel**: Cancel the booking (returns lesson to client\'s package)',
          '  • **Mark Completed**: Manually mark as completed',
          '  • **Add Notes**: Add internal notes about the session'
        ],
        tips: [
          'Cancelled bookings return the lesson to the client\'s available balance',
          'No-shows should be marked as completed (lesson is used)',
          'Use notes to track session focus or client progress',
          'Export bookings to CSV for external record-keeping',
          'Mobile apps send push notifications for upcoming sessions'
        ]
      },
      {
        id: 'blocking-time',
        title: 'Blocking Time Off',
        content: 'Need to take time off? Block your schedule so clients cannot book during vacation, holidays, or personal time.',
        steps: [
          'Method 1: Don\'t create availability for that time period',
          'Method 2: Delete existing availability slots:',
          '  • Go to **Scheduling → Schedule**',
          '  • Find the availability slots you want to remove',
          '  • Click the slot and select **Delete**',
          '  • Confirm deletion',
          'Method 3: Cancel recurring slots:',
          '  • Click a recurring slot',
          '  • Select **Delete Series** to remove all future instances',
          'Any existing bookings during that time remain - you\'ll need to contact those clients'
        ],
        tips: [
          'Give clients 1-2 weeks notice before blocking time',
          'Consider offering makeup sessions for affected bookings',
          'For holidays, block time 2-4 weeks in advance',
          'Set your vacation schedule at the start of each season'
        ]
      }
    ]
  },
  {
    id: 'clients',
    title: 'Managing Clients',
    icon: Users,
    order: 5,
    category: 'daily',
    subsections: [
      {
        id: 'client-overview',
        title: 'Client Management Overview',
        content: 'The Clients section is your central hub for managing relationships, viewing session history, tracking packages, and understanding client engagement.',
        tips: [
          'All clients who download your app appear here automatically',
          'Client profiles show complete history: bookings, packages, payments',
          'Use search to quickly find clients by name or email',
          'Export client list to CSV for marketing or reporting'
        ]
      },
      {
        id: 'viewing-clients',
        title: 'Viewing Client Information',
        content: 'Each client has a detailed profile with their complete history and current status.',
        steps: [
          'Go to **Scheduling → Clients**',
          'Browse the client list or use the search bar',
          'Click a client to open their detail page',
          'Review their information:',
          '  • **Contact Details**: Name, email, phone',
          '  • **Active Packages**: Current lesson packages and balances',
          '  • **Booking History**: Past and upcoming sessions',
          '  • **Package History**: All packages ever purchased',
          '  • **Intake Form**: Their intake form responses',
          '  • **Waiver Status**: Whether they\'ve signed the waiver',
          '  • **Total Spent**: Lifetime revenue from this client',
          '  • **Join Date**: When they created their account'
        ],
        tips: [
          'Green badges = active packages with lessons remaining',
          'Red badges = expired or depleted packages',
          'Click package to see detailed usage history',
          'Use booking history to track session frequency',
          'Download signed waiver PDF from their profile'
        ]
      },
      {
        id: 'manual-packages',
        title: 'Manually Adding Packages',
        content: 'Sometimes you need to add packages manually - for comped sessions, special deals, or fixing errors.',
        steps: [
          'Open the client\'s profile page',
          'Scroll to the **"Packages"** section',
          'Click **"+ Add Package"** button',
          'Fill in package details:',
          '  • **Package Type**: Select from your defined packages',
          '  • **Total Lessons**: Number of sessions to add',
          '  • **Price Paid**: Amount (can be $0 for comped)',
          '  • **Purchase Date**: Date of purchase',
          '  • **Expiration Date**: When package expires',
          '  • **Transaction ID**: Optional reference number',
          'Click **"Add Package"**',
          'The package immediately appears in their profile and mobile app'
        ],
        tips: [
          'Use $0 price for complimentary sessions or makeups',
          'Set far future expiration for packages that shouldn\'t expire',
          'Add notes in transaction ID for why package was manually added',
          'Manual packages work identically to purchased packages'
        ],
        faq: [
          {
            q: 'Can I remove a package after adding it?',
            a: 'Not currently. If you need to remove a package, contact support. For now, you can set remaining lessons to 0.'
          },
          {
            q: 'Will manually added packages appear in reports?',
            a: 'Yes, all packages appear in reports regardless of how they were added. Manual packages are included in usage reports but can be filtered out of revenue reports by price.'
          }
        ]
      },
      {
        id: 'client-communication',
        title: 'Communicating with Clients',
        content: 'Stay connected with clients through the app and email notifications.',
        tips: [
          'Clients receive email confirmations for all bookings',
          'Push notifications alert clients of upcoming sessions',
          'For personalized messages, use email or text directly',
          'Booking notes are internal only - clients don\'t see them',
          'Consider creating a client onboarding email sequence'
        ]
      }
    ]
  },
  {
    id: 'trainers',
    title: 'Managing Trainers',
    icon: UserPlus,
    order: 6,
    category: 'daily',
    subsections: [
      {
        id: 'trainer-overview',
        title: 'Multi-Trainer Support',
        content: 'Skedence supports unlimited trainers. Each trainer has their own app access, schedule, and can be assigned to bookings.',
        tips: [
          'Perfect for growing from solo trainer to team',
          'Each trainer manages their own availability',
          'Assign trainers to specific locations or specialties',
          'Track individual trainer performance in reports'
        ]
      },
      {
        id: 'adding-trainers',
        title: 'Adding New Trainers',
        content: 'Invite trainers to join your organization. They\'ll receive an email with setup instructions.',
        steps: [
          'Navigate to **Scheduling → Trainers**',
          'Click **"+ Add Trainer"** button',
          'Enter trainer details:',
          '  • **First Name**',
          '  • **Last Name**',
          '  • **Email Address**',
          '  • **Phone Number**',
          'Choose their role:',
          '  • **Trainer**: Can manage own schedule and see own clients',
          '  • **Admin**: Full access to all features and settings',
          'Click **"Send Invitation"**',
          'Trainer receives an email with:',
          '  • Link to download SkedenceAdmin app',
          '  • Temporary password setup link',
          '  • Instructions for getting started',
          'Trainer completes setup:',
          '  • Downloads the app',
          '  • Creates their password',
          '  • Logs in and starts using the app',
          'They now appear in your trainers list'
        ],
        tips: [
          'Use their professional email address',
          'Password setup links expire after 7 days',
          'Trainers can reset their password anytime',
          'Admins can see all data; trainers see only their data',
          'You can change trainer roles anytime'
        ],
        faq: [
          {
            q: 'What\'s the difference between Trainer and Admin roles?',
            a: 'Trainers can manage their own schedule, see their bookings, and view assigned clients. Admins have full access to all features, settings, reports, and can manage other trainers.'
          },
          {
            q: 'Can trainers see each other\'s schedules?',
            a: 'No, trainers can only see their own schedule. Admins can see all trainers\' schedules.'
          },
          {
            q: 'What happens if a trainer leaves?',
            a: 'You can deactivate their account, which prevents login but preserves their historical data. Their past bookings and client relationships remain visible.'
          },
          {
            q: 'Can trainers access the web portal?',
            a: 'Yes, all trainers can log in to the web portal at skedence.com. Their access level matches their role (Trainer or Admin).'
          }
        ]
      },
      {
        id: 'trainer-permissions',
        title: 'Trainer Permissions',
        content: 'Control what trainers can access and modify.',
        tips: [
          '**Trainers can**: Create availability, view their bookings, see assigned clients, mark sessions complete',
          '**Trainers cannot**: Change pricing, view all clients, access reports, modify organization settings, manage other trainers',
          '**Admins can**: Everything trainers can do, plus full access to all features',
          'Promote trainers to admin when they take on leadership roles',
          'Most organizations have 1-2 admins and unlimited trainers'
        ]
      }
    ]
  },
  {
    id: 'reports',
    title: 'Reports & Analytics',
    icon: BarChart3,
    order: 7,
    category: 'advanced',
    subsections: [
      {
        id: 'reports-overview',
        title: 'Understanding Your Reports',
        content: 'Skedence provides detailed analytics to help you understand your business performance, identify trends, and make data-driven decisions.',
        tips: [
          'Reports update in real-time as data changes',
          'Filter all reports by date range',
          'Export reports to CSV for deeper analysis',
          'Check reports weekly to spot trends early'
        ]
      },
      {
        id: 'appointment-report',
        title: 'Appointment Analytics',
        content: 'Track booking trends, popular time slots, and trainer utilization.',
        steps: [
          'Go to **Reports → Appointments**',
          'Select date range (last 7 days, 30 days, custom)',
          'View metrics:',
          '  • **Total Bookings**: Number of sessions',
          '  • **Booking Rate**: How fast slots get booked',
          '  • **Popular Times**: Most-booked time slots',
          '  • **Trainer Activity**: Bookings per trainer',
          '  • **Location Usage**: Most popular locations',
          '  • **Cancellation Rate**: Percentage of cancelled bookings',
          'Use charts to identify patterns',
          'Export data for custom analysis'
        ],
        tips: [
          'Peak hours often require more trainers or resources',
          'Low cancellation rate (under 10%) is healthy',
          'Consistent booking patterns indicate strong retention',
          'Track month-over-month growth to measure success'
        ]
      },
      {
        id: 'revenue-report',
        title: 'Revenue Analytics',
        content: 'Monitor income, popular packages, and financial trends.',
        steps: [
          'Navigate to **Reports → Revenue**',
          'Select time period to analyze',
          'Review metrics:',
          '  • **Total Revenue**: All package sales',
          '  • **Average Transaction**: Average package price',
          '  • **Package Sales**: Breakdown by package type',
          '  • **Revenue by Trainer**: Who generates most sales',
          '  • **Monthly Recurring**: Predictable income',
          'View revenue charts and trends',
          'Compare periods (e.g., this month vs last month)'
        ],
        tips: [
          'Best-selling packages indicate market demand',
          'Diversify package offerings if one dominates',
          'Track average transaction size over time',
          'Set monthly revenue goals and monitor progress',
          'Seasonal trends are normal for training businesses'
        ]
      },
      {
        id: 'user-report',
        title: 'User Sign-Up Analytics',
        content: 'Track client acquisition, growth rate, and retention.',
        steps: [
          'Go to **Reports → Users**',
          'View client growth metrics:',
          '  • **Total Clients**: All registered users',
          '  • **New This Month**: Recent signups',
          '  • **Sign-Up Trend**: Growth over time',
          '  • **Active Clients**: Those with upcoming bookings',
          '  • **Inactive Clients**: Haven\'t booked in 30+ days',
          'Identify acquisition channels if tracked',
          'Monitor retention rates'
        ],
        tips: [
          'Healthy businesses add 5-10% new clients monthly',
          'Reactivate inactive clients with email campaigns',
          'Track where clients find you (ask during intake)',
          'Client lifetime value = Total spent / Months active'
        ]
      }
    ]
  },
  {
    id: 'mobile-apps',
    title: 'Mobile Apps',
    icon: Zap,
    order: 8,
    category: 'daily',
    subsections: [
      {
        id: 'admin-app',
        title: 'SkedenceAdmin App (Trainer App)',
        content: 'Your business in your pocket. The admin app lets you manage your business from anywhere.',
        steps: [
          'Download **SkedenceAdmin** from the App Store',
          'Sign in with your email and password',
          'Grant notification permissions for booking alerts',
          'Features available:',
          '  • **Schedule**: View and manage your calendar',
          '  • **Clients**: Browse client list, view profiles',
          '  • **Bookings**: See upcoming and past sessions',
          '  • **Manage**: Access to business settings',
          '  • **Profile**: Your account settings'
        ],
        tips: [
          'Enable notifications to never miss a booking',
          'Use the app to check your schedule while on the go',
          'Quick booking creation for walk-in clients',
          'Mark sessions complete right after training',
          'iPad optimized for larger screen experience'
        ]
      },
      {
        id: 'client-app',
        title: 'Skedence App (Client App)',
        content: 'What your clients see and use to book sessions.',
        steps: [
          'Clients download **Skedence** from the App Store',
          'They create account with email and password',
          'Complete intake form (if required)',
          'Sign waiver (if required)',
          'Browse and purchase lesson packages',
          'View available time slots',
          'Book sessions with preferred trainer',
          'Receive booking confirmations and reminders',
          'Track remaining lessons in packages'
        ],
        tips: [
          'Test the client experience yourself with a test account',
          'The client app shows your branding and colors',
          'Booking process takes less than 60 seconds',
          'Clients can manage bookings and view history',
          'Push notifications remind clients of upcoming sessions'
        ]
      },
      {
        id: 'app-faq',
        title: 'Mobile App FAQ',
        content: '',
        faq: [
          {
            q: 'Do clients need the app to book?',
            a: 'Currently yes, the client app is required for booking. Web booking is planned for a future update.'
          },
          {
            q: 'Is there an Android version?',
            a: 'Not yet. iOS apps (iPhone and iPad) are available now. Android is coming in 2026 Q2.'
          },
          {
            q: 'Can trainers use the web portal instead of the app?',
            a: 'Yes! Trainers can use both. The web portal at skedence.com has all the same features as the mobile app.'
          },
          {
            q: 'What iOS version is required?',
            a: 'iOS 15.0 or later for both apps.'
          }
        ]
      }
    ]
  },
  {
    id: 'daily-workflow',
    title: 'Daily Workflow Tips',
    icon: CheckCircle2,
    order: 9,
    category: 'daily',
    subsections: [
      {
        id: 'morning-routine',
        title: 'Morning Routine (5 minutes)',
        content: 'Start your day prepared and organized.',
        steps: [
          'Check **Activity Feed** for overnight bookings',
          'Review **Today\'s Schedule** in Scheduling tab',
          'Verify all clients have active packages',
          'Check for any booking conflicts or cancellations',
          'Respond to any client messages or inquiries',
          'Review weather if training outdoors'
        ]
      },
      {
        id: 'after-session',
        title: 'After Each Session (30 seconds)',
        content: 'Quick actions to keep records accurate.',
        steps: [
          'Mark session as **Completed** if not auto-completed',
          'Add any important **Notes** about the session',
          'Note client progress or concerns in their profile',
          'If client ran out of lessons, remind them to purchase more'
        ]
      },
      {
        id: 'weekly-review',
        title: 'Weekly Review (15 minutes)',
        content: 'Stay on top of your business every week.',
        steps: [
          'Check **Revenue Report** for the week',
          'Review **Appointment Analytics** for patterns',
          'Identify clients who haven\'t booked in 2+ weeks',
          'Send follow-up messages to inactive clients',
          'Create availability for the next 2 weeks',
          'Check package inventory for low-balance clients',
          'Review upcoming holidays and block time off'
        ]
      },
      {
        id: 'monthly-tasks',
        title: 'Monthly Tasks (30 minutes)',
        content: 'Monthly maintenance keeps your business running smoothly.',
        steps: [
          'Review all reports and identify trends',
          'Check Stripe dashboard for deposit reconciliation',
          'Update pricing if needed for new season',
          'Archive old locations or packages',
          'Review and update waiver text if laws changed',
          'Check trainer performance and provide feedback',
          'Plan marketing campaigns for slow periods',
          'Update intake form questions if needed',
          'Review subscription plan and usage limits'
        ]
      }
    ]
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting & FAQ',
    icon: MessageSquare,
    order: 10,
    category: 'advanced',
    subsections: [
      {
        id: 'common-issues',
        title: 'Common Issues',
        content: '',
        faq: [
          {
            q: 'Clients say they can\'t see any available time slots',
            a: 'Check: 1) Have you created availability slots? 2) Are slots in the future? 3) Are slots already booked? 4) Is the trainer marked as active? 5) Is the location active?'
          },
          {
            q: 'Client\'s payment failed during checkout',
            a: 'This is usually a Stripe/card issue. Ask client to: 1) Check if card is expired, 2) Try a different payment method, 3) Contact their bank. You can also manually add a package for them if needed.'
          },
          {
            q: 'I don\'t see a booking but the client says they booked',
            a: 'Check these places: 1) Bookings tab with date filter expanded, 2) Scheduling → Schedule calendar view, 3) Client\'s profile → booking history. If still missing, check if it was cancelled or if there was a sync issue.'
          },
          {
            q: 'Package balance is wrong after cancellation',
            a: 'Cancelled bookings should auto-return lessons. If not, you may need to manually adjust. Contact support if this happens frequently.'
          },
          {
            q: 'Client can\'t download the app',
            a: 'Ensure they\'re searching for the correct app: "Skedence" for clients, "SkedenceAdmin" for trainers. Must have iOS 15+ and be in a supported region (US App Store).'
          },
          {
            q: 'Stripe isn\'t connected',
            a: 'Go to Business Settings → Stripe. If you see "Not Connected", click to reconnect. If issues persist, you may need to create a new Stripe account and reconnect.'
          },
          {
            q: 'I added availability but it\'s not showing in the client app',
            a: 'Check: 1) Is it in the future? 2) Is the trainer active? 3) Try closing and reopening the client app. 4) Check if the slot was already booked.'
          },
          {
            q: 'How do I refund a client?',
            a: 'Go to your Stripe dashboard (stripe.com), find the charge, and issue a refund there. Then manually remove or adjust the package in Skedence.'
          }
        ]
      },
      {
        id: 'best-practices',
        title: 'Best Practices',
        content: '',
        tips: [
          '**Respond Fast**: Reply to client inquiries within 2 hours during business hours',
          '**Consistent Availability**: Create at least 2 weeks of availability at all times',
          '**Package Reminders**: Notify clients when they have 2-3 lessons remaining',
          '**No-Show Policy**: Have a clear policy and communicate it in your waiver',
          '**Backup Data**: Export reports monthly for your records',
          '**Professional Photos**: Use high-quality photos for your logo and locations',
          '**Clear Communication**: Set expectations in intake form and waiver',
          '**Seasonal Planning**: Plan promotions and pricing changes in advance',
          '**Client Retention**: Touch base with clients who haven\'t booked in 30 days',
          '**Review Reports**: Check analytics weekly to spot trends early'
        ]
      },
      {
        id: 'getting-help',
        title: 'Getting Help',
        content: 'We\'re here to help you succeed!',
        steps: [
          'Email support: support@skedence.com',
          'Response time: Within 24 hours (usually faster)',
          'Include in your message:',
          '  • Your organization name',
          '  • Detailed description of the issue',
          '  • Screenshots if applicable',
          '  • Steps to reproduce the problem',
          '  • What you\'ve already tried',
          'For urgent issues: Note "URGENT" in subject line',
          'Feature requests: We love feedback! Share your ideas.'
        ],
        tips: [
          'Check this guide first - most questions are answered here',
          'Screenshots help us understand issues faster',
          'Be specific: "Client John Smith can\'t book" vs "Booking broken"',
          'Check your spam folder for our replies',
          'Follow up if you don\'t hear back in 48 hours'
        ]
      }
    ]
  }
];

export default function GettingStartedPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['stripe'])); // First section expanded by default
  const [expandedSubsections, setExpandedSubsections] = useState<Set<string>>(new Set());

  // Filter sections based on search
  const filteredSections = guideSections.filter(section => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    
    // Search in section title
    if (section.title.toLowerCase().includes(query)) return true;
    
    // Search in subsection content
    return section.subsections.some(sub => 
      sub.title.toLowerCase().includes(query) ||
      sub.content.toLowerCase().includes(query) ||
      sub.steps?.some(step => step.toLowerCase().includes(query)) ||
      sub.tips?.some(tip => tip.toLowerCase().includes(query)) ||
      sub.faq?.some(faq => 
        faq.q.toLowerCase().includes(query) || 
        faq.a.toLowerCase().includes(query)
      )
    );
  });

  // Auto-expand all sections when searching
  const displayedSections = searchQuery 
    ? new Set(filteredSections.map(s => s.id))
    : expandedSections;

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const toggleSubsection = (subsectionId: string) => {
    const newExpanded = new Set(expandedSubsections);
    if (newExpanded.has(subsectionId)) {
      newExpanded.delete(subsectionId);
    } else {
      newExpanded.add(subsectionId);
    }
    setExpandedSubsections(newExpanded);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'essential':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'setup':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'daily':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'advanced':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'essential':
        return 'Essential Setup';
      case 'setup':
        return 'Configuration';
      case 'daily':
        return 'Daily Use';
      case 'advanced':
        return 'Advanced';
      default:
        return category;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Getting Started Guide</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Complete setup guide and FAQ for the Skedence admin portal
          </p>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search guides and FAQs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 text-base"
              />
            </div>
            {searchQuery && (
              <p className="text-sm text-muted-foreground mt-3">
                Found {filteredSections.length} section{filteredSections.length !== 1 ? 's' : ''} matching "{searchQuery}"
              </p>
            )}
          </CardContent>
        </Card>

        {/* Quick Links */}
        {!searchQuery && (
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-blue-600" />
                Quick Start Checklist
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  onClick={() => {
                    toggleSection('stripe');
                    document.getElementById('stripe')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="flex items-center gap-3 p-3 bg-white rounded-lg border border-blue-200 hover:border-blue-400 transition-all text-left"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-semibold">
                    1
                  </div>
                  <div>
                    <div className="font-medium">Connect Stripe</div>
                    <div className="text-xs text-muted-foreground">Start accepting payments</div>
                  </div>
                </button>
                
                <button
                  onClick={() => {
                    toggleSection('pricing');
                    document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="flex items-center gap-3 p-3 bg-white rounded-lg border border-blue-200 hover:border-blue-400 transition-all text-left"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-semibold">
                    2
                  </div>
                  <div>
                    <div className="font-medium">Set Your Pricing</div>
                    <div className="text-xs text-muted-foreground">Create packages</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    toggleSection('business-settings');
                    document.getElementById('business-settings')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="flex items-center gap-3 p-3 bg-white rounded-lg border border-blue-200 hover:border-blue-400 transition-all text-left"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-semibold">
                    3
                  </div>
                  <div>
                    <div className="font-medium">Configure Settings</div>
                    <div className="text-xs text-muted-foreground">Waivers, intake, locations</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    toggleSection('scheduling');
                    document.getElementById('scheduling')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="flex items-center gap-3 p-3 bg-white rounded-lg border border-blue-200 hover:border-blue-400 transition-all text-left"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-semibold">
                    4
                  </div>
                  <div>
                    <div className="font-medium">Create Availability</div>
                    <div className="text-xs text-muted-foreground">Set your schedule</div>
                  </div>
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Guide Sections */}
        <div className="space-y-4">
          {filteredSections.map((section) => {
            const Icon = section.icon;
            const isExpanded = displayedSections.has(section.id);

            return (
              <div key={section.id} id={section.id} className="scroll-mt-6">
                <Card>
                <CardHeader>
                  <div 
                    className="cursor-pointer hover:bg-muted/50 transition-colors -mx-6 -my-4 px-6 py-4"
                    onClick={() => toggleSection(section.id)}
                  >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <CardTitle className="text-xl">{section.title}</CardTitle>
                          <span className={cn(
                            'text-xs px-2 py-1 rounded-full border font-medium',
                            getCategoryColor(section.category)
                          )}>
                            {getCategoryLabel(section.category)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {section.subsections.length} topic{section.subsections.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="space-y-6 pt-0">
                    {section.subsections.map((subsection) => (
                      <div key={subsection.id} className="border-l-2 border-primary/20 pl-6 space-y-4">
                        <div>
                          <h3 className="font-semibold text-lg mb-2">{subsection.title}</h3>
                          {subsection.content && (
                            <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                              {subsection.content}
                            </p>
                          )}
                        </div>

                        {/* Steps */}
                        {subsection.steps && subsection.steps.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="font-medium text-sm uppercase tracking-wide text-primary flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4" />
                              Step-by-Step Instructions
                            </h4>
                            <ol className="space-y-3">
                              {subsection.steps.map((step, idx) => (
                                <li key={idx} className="flex gap-3">
                                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-semibold flex-shrink-0 mt-0.5">
                                    {idx + 1}
                                  </span>
                                  <span className="text-sm leading-relaxed pt-0.5 whitespace-pre-line">{step}</span>
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}

                        {/* Tips */}
                        {subsection.tips && subsection.tips.length > 0 && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-2">
                            <h4 className="font-medium text-sm uppercase tracking-wide text-yellow-800 flex items-center gap-2">
                              <Zap className="h-4 w-4" />
                              Pro Tips
                            </h4>
                            <ul className="space-y-2">
                              {subsection.tips.map((tip, idx) => (
                                <li key={idx} className="flex gap-2 text-sm text-yellow-900 leading-relaxed">
                                  <span className="text-yellow-600 flex-shrink-0">•</span>
                                  <span className="whitespace-pre-line">{tip}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* FAQ */}
                        {subsection.faq && subsection.faq.length > 0 && (
                          <div className="space-y-3">
                            <h4 className="font-medium text-sm uppercase tracking-wide text-primary flex items-center gap-2">
                              <MessageSquare className="h-4 w-4" />
                              Frequently Asked Questions
                            </h4>
                            {subsection.faq.map((item, idx) => (
                              <div key={idx} className="bg-muted/50 rounded-lg p-4 space-y-2">
                                <div className="font-medium text-sm text-foreground">{item.q}</div>
                                <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{item.a}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                )}
              </Card>
              </div>
            );
          })}
        </div>

        {/* No Results */}
        {searchQuery && filteredSections.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No results found</h3>
              <p className="text-muted-foreground mb-4">
                Try different keywords or browse all sections
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className="text-primary hover:underline"
              >
                Clear search
              </button>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
          <CardContent className="py-6">
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-purple-100 flex-shrink-0">
                <Mail className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Still have questions?</h3>
                <p className="text-muted-foreground mb-3">
                  We're here to help! Our support team typically responds within 24 hours.
                </p>
                <a
                  href="mailto:support@skedence.com"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                >
                  <Mail className="h-4 w-4" />
                  Email Support
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
  );
}
