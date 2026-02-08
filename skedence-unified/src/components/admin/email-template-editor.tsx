'use client';

import { useState, useEffect } from 'react';
import { X, Eye, RotateCcw, Save, Copy } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface EmailTemplate {
  subject: string;
  body: string;
  variables?: string[];
  lastModified?: Date;
  modifiedBy?: string;
}

interface EmailTemplateEditorProps {
  orgId: string;
  templateType: string;
  templateName: string;
  onClose: () => void;
}

// Default templates for each type
const DEFAULT_TEMPLATES: Record<string, EmailTemplate> = {
  bookingConfirmation: {
    subject: '✅ Booking Confirmed - {{trainerName}} on {{date}}',
    body: `<h2>Your Training Session is Confirmed!</h2>
<p>Hi {{clientName}},</p>
<p>Your session with {{trainerName}} has been confirmed.</p>

<div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <h3>Session Details</h3>
  <p><strong>Date:</strong> {{date}}</p>
  <p><strong>Time:</strong> {{time}}</p>
  <p><strong>Duration:</strong> {{duration}} minutes</p>
  <p><strong>Package:</strong> {{packageName}}</p>
  <p><strong>Location:</strong> {{location}}</p>
</div>

<p>Need to reschedule? Contact {{trainerName}} at {{trainerEmail}}</p>

<p>See you soon!<br>The {{orgName}} Team</p>`,
    variables: ['clientName', 'trainerName', 'date', 'time', 'duration', 'packageName', 'location', 'trainerEmail', 'orgName'],
  },
  cancellationConfirmation: {
    subject: '❌ Cancellation Confirmed - {{trainerName}} on {{date}}',
    body: `<h2>Your Session Has Been Cancelled</h2>
<p>Hi {{clientName}},</p>
<p>Your session with {{trainerName}} on {{date}} at {{time}} has been cancelled.</p>

<p>If you need to reschedule, please contact us or book another session through the app.</p>

<p>Thanks,<br>The {{orgName}} Team</p>`,
    variables: ['clientName', 'trainerName', 'date', 'time', 'orgName'],
  },
  rescheduleConfirmation: {
    subject: '🔄 Session Rescheduled - New Time with {{trainerName}}',
    body: `<h2>Your Session Has Been Rescheduled</h2>
<p>Hi {{clientName}},</p>
<p>Your session with {{trainerName}} has been rescheduled.</p>

<div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <h3>New Session Details</h3>
  <p><strong>Date:</strong> {{date}}</p>
  <p><strong>Time:</strong> {{time}}</p>
  <p><strong>Duration:</strong> {{duration}} minutes</p>
  <p><strong>Location:</strong> {{location}}</p>
</div>

<p>See you soon!<br>The {{orgName}} Team</p>`,
    variables: ['clientName', 'trainerName', 'date', 'time', 'duration', 'location', 'orgName'],
  },
  reminders: {
    subject: '⏰ Reminder: Session Tomorrow with {{trainerName}}',
    body: `<h2>Your Session is Tomorrow!</h2>
<p>Hi {{clientName}},</p>
<p>Just a friendly reminder about your upcoming session with {{trainerName}}.</p>

<div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <h3>Tomorrow's Session</h3>
  <p><strong>Date:</strong> {{date}}</p>
  <p><strong>Time:</strong> {{time}}</p>
  <p><strong>Duration:</strong> {{duration}} minutes</p>
  <p><strong>Location:</strong> {{location}}</p>
</div>

<p>Need to cancel? Please contact us at least {{cancellationHours}} hours in advance.</p>

<p>Looking forward to seeing you!<br>{{trainerName}}</p>`,
    variables: ['clientName', 'trainerName', 'date', 'time', 'duration', 'location', 'cancellationHours'],
  },
  followUps: {
    subject: '⭐ How Was Your Session with {{trainerName}}?',
    body: `<h2>Thanks for Training With Us!</h2>
<p>Hi {{clientName}},</p>
<p>We hope you had a great session with {{trainerName}}!</p>

<p>We'd love to hear your feedback to help us continue improving.</p>

<h3>Ready to Book Your Next Session?</h3>
<p>Visit our app to schedule your next training session.</p>

<p>Thanks for being part of our community!<br>The {{orgName}} Team</p>`,
    variables: ['clientName', 'trainerName', 'orgName'],
  },
  packageReceipt: {
    subject: '🎁 Receipt: {{packageName}} Purchase',
    body: `<h2>Thank You for Your Purchase!</h2>
<p>Hi {{clientName}},</p>
<p>Here's your receipt for your recent purchase.</p>

<div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <h3>Purchase Details</h3>
  <p><strong>Package:</strong> {{packageName}}</p>
  <p><strong>Amount:</strong> ${'{{amount}}'}</p>
  <p><strong>Date:</strong> {{date}}</p>
  <p><strong>Sessions Remaining:</strong> {{sessionsRemaining}}</p>
</div>

<p>You can start booking your sessions right away!</p>

<p>Thanks,<br>The {{orgName}} Team</p>`,
    variables: ['clientName', 'packageName', 'amount', 'date', 'sessionsRemaining', 'orgName'],
  },
};

// Variable descriptions for the legend
const VARIABLE_DESCRIPTIONS: Record<string, string> = {
  clientName: "Client's full name",
  trainerName: "Trainer's full name",
  athleteName: "Athlete's full name",
  date: "Session date (formatted)",
  time: "Session time",
  duration: "Session duration in minutes",
  packageName: "Name of the lesson package",
  location: "Session location",
  trainerEmail: "Trainer's email address",
  orgName: "Your organization name",
  cancellationHours: "Cancellation policy hours",
  amount: "Purchase amount",
  sessionsRemaining: "Number of sessions remaining",
};

export function EmailTemplateEditor({ orgId, templateType, templateName, onClose }: EmailTemplateEditorProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [template, setTemplate] = useState<EmailTemplate>(DEFAULT_TEMPLATES[templateType] || { subject: '', body: '' });
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadTemplate();
  }, [orgId, templateType]);

  const loadTemplate = async () => {
    try {
      const templateDoc = await getDoc(
        doc(db, 'organizations', orgId, 'emailTemplates', templateType)
      );

      if (templateDoc.exists()) {
        setTemplate(templateDoc.data() as EmailTemplate);
      } else {
        // Use default template if none exists
        setTemplate(DEFAULT_TEMPLATES[templateType]);
      }
    } catch (error) {
      console.error('Error loading template:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveTemplate = async () => {
    setSaving(true);
    try {
      await setDoc(
        doc(db, 'organizations', orgId, 'emailTemplates', templateType),
        {
          ...template,
          lastModified: new Date(),
        },
        { merge: true }
      );
      onClose();
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Failed to save template. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefault = () => {
    if (confirm('Reset this email template to default? Your custom changes will be lost.')) {
      setTemplate(DEFAULT_TEMPLATES[templateType]);
    }
  };

  const insertVariable = (variable: string) => {
    const textarea = document.getElementById('email-body') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = template.body;
      const before = text.substring(0, start);
      const after = text.substring(end);
      const newText = before + `{{${variable}}}` + after;
      setTemplate({ ...template, body: newText });
      
      // Restore cursor position
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.length + 4, start + variable.length + 4);
      }, 0);
    }
  };

  const getPreviewBody = () => {
    let preview = template.body;
    const sampleData: Record<string, string> = {
      clientName: 'John Smith',
      trainerName: 'Coach Sarah',
      athleteName: 'Emma Smith',
      date: 'Monday, March 15, 2026',
      time: '4:00 PM',
      duration: '60',
      packageName: '10 Session Package',
      location: 'Main Gym',
      trainerEmail: 'coach@example.com',
      orgName: 'Your Organization',
      cancellationHours: '24',
      amount: '150.00',
      sessionsRemaining: '10',
    };

    Object.keys(sampleData).forEach((key) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      preview = preview.replace(regex, sampleData[key]);
    });

    return preview;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{templateName}</h2>
            <p className="text-sm text-gray-500 mt-1">Customize this email template for your clients</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Editor */}
            <div className="lg:col-span-2 space-y-4">
              {/* Subject Line */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject Line
                </label>
                <input
                  type="text"
                  value={template.subject}
                  onChange={(e) => setTemplate({ ...template, subject: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Email subject line"
                />
              </div>

              {/* Email Body */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Body (HTML)
                </label>
                <textarea
                  id="email-body"
                  value={template.body}
                  onChange={(e) => setTemplate({ ...template, body: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  rows={20}
                  placeholder="Email body content with HTML"
                />
              </div>

              {/* Preview Toggle */}
              <div>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Eye className="h-4 w-4" />
                  {showPreview ? 'Hide' : 'Show'} Preview
                </button>

                {showPreview && (
                  <div className="mt-4 border border-gray-200 rounded-lg p-6 bg-gray-50">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Preview (with sample data):</h3>
                    <div 
                      className="bg-white p-6 rounded border border-gray-200"
                      dangerouslySetInnerHTML={{ __html: getPreviewBody() }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Variables Legend */}
            <div>
              <div className="sticky top-0">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Available Variables</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Click a variable to insert it at your cursor position
                </p>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-xs text-blue-800">
                    💡 <strong>Tip:</strong> Variables are replaced with actual data when the email is sent
                  </p>
                </div>

                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {DEFAULT_TEMPLATES[templateType]?.variables?.map((variable) => (
                    <button
                      key={variable}
                      onClick={() => insertVariable(variable)}
                      className="w-full text-left p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <code className="text-sm font-mono text-blue-600 break-all">
                            {`{{${variable}}}`}
                          </code>
                          <p className="text-xs text-gray-600 mt-1">
                            {VARIABLE_DESCRIPTIONS[variable] || 'Dynamic value'}
                          </p>
                        </div>
                        <Copy className="h-4 w-4 text-gray-400 group-hover:text-blue-600 flex-shrink-0" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={resetToDefault}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            Reset to Default
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={saveTemplate}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Template
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
