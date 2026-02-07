'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { BusinessSettingsSubmenu } from '@/components/admin/business-settings-submenu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Plus, Trash2, GripVertical, AlertCircle } from 'lucide-react';

interface IntakeField {
  id: string;
  label: string;
  fieldType: 'text' | 'email' | 'phone' | 'date' | 'textarea' | 'select' | 'number';
  required: boolean;
  placeholder?: string;
  options?: string[]; // For select fields
  order: number;
  section: 'athlete' | 'parent' | 'emergency' | 'other';
}

const defaultFields: IntakeField[] = [
  { id: 'athleteFullName', label: 'Athlete Full Name', fieldType: 'text', required: true, order: 0, section: 'athlete' },
  { id: 'athleteBirthday', label: 'Athlete Birthday', fieldType: 'date', required: true, order: 1, section: 'athlete' },
  { id: 'schoolTeam', label: 'School / Club Team', fieldType: 'text', required: false, order: 2, section: 'athlete' },
  { id: 'experienceLevel', label: 'Experience Level', fieldType: 'select', required: false, order: 3, section: 'athlete', options: ['Beginner', 'Intermediate', 'Advanced', 'Elite'] },
  { id: 'parentFullName', label: 'Parent / Guardian Full Name', fieldType: 'text', required: true, order: 4, section: 'parent' },
  { id: 'emergencyContactName', label: 'Emergency Contact Name', fieldType: 'text', required: true, order: 5, section: 'emergency' },
  { id: 'emergencyContactNumber', label: 'Emergency Contact Number', fieldType: 'phone', required: true, order: 6, section: 'emergency' },
  { id: 'coachNotes', label: 'Notes for Coach (Goals, Injuries, Allergies, etc.)', fieldType: 'textarea', required: false, order: 7, section: 'other' },
  { id: 'referredBy', label: 'Referred by?', fieldType: 'text', required: false, order: 8, section: 'other' },
];

export default function IntakeFormsPage() {
  const { orgId } = useAuth();
  const [activeTab, setActiveTab] = useState<'private' | 'class'>('private');
  const [privateFields, setPrivateFields] = useState<IntakeField[]>(defaultFields);
  const [classFields, setClassFields] = useState<IntakeField[]>(defaultFields);
  const [loading, setLoading] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);

  const fields = activeTab === 'private' ? privateFields : classFields;
  const setFields = activeTab === 'private' ? setPrivateFields : setClassFields;

  useEffect(() => {
    if (!orgId) return;

    async function loadFields() {
      try {
        const orgDoc = await getDoc(doc(db, 'organizations', orgId!));
        if (orgDoc.exists()) {
          const data = orgDoc.data();
          
          // Load private lesson fields
          if (data.intakeFormFieldsPrivate && data.intakeFormFieldsPrivate.length > 0) {
            setPrivateFields(data.intakeFormFieldsPrivate);
          } else if (data.intakeFormFields && data.intakeFormFields.length > 0) {
            // Migrate from old single field list
            setPrivateFields(data.intakeFormFields);
          }
          
          // Load class fields
          if (data.intakeFormFieldsClass && data.intakeFormFieldsClass.length > 0) {
            setClassFields(data.intakeFormFieldsClass);
          } else if (data.intakeFormFields && data.intakeFormFields.length > 0) {
            // Migrate from old single field list
            setClassFields(data.intakeFormFields);
          }
        }
      } catch (error) {
        console.error('Error loading intake form fields:', error);
      } finally {
        setLoading(false);
      }
    }

    loadFields();
  }, [orgId]);

  const saveFields = useCallback(async (newFields: IntakeField[], type: 'private' | 'class') => {
    if (!orgId) return;

    try {
      const fieldName = type === 'private' ? 'intakeFormFieldsPrivate' : 'intakeFormFieldsClass';
      await setDoc(doc(db, 'organizations', orgId), { [fieldName]: newFields }, { merge: true });
      setLastSaved(new Date());
      console.log(`Intake form fields (${type}) auto-saved to Firebase`);
    } catch (error) {
      console.error('Error saving intake form fields:', error);
    }
  }, [orgId]);

  const addField = () => {
    const newField: IntakeField = {
      id: `custom_${Date.now()}`,
      label: 'New Field',
      fieldType: 'text',
      required: false,
      order: fields.length,
      section: 'other',
    };
    const newFields = [...fields, newField];
    setFields(newFields);
    setEditingField(newField.id);
    saveFields(newFields, activeTab);
  };

  const updateField = (id: string, updates: Partial<IntakeField>) => {
    const newFields = fields.map(f => f.id === id ? { ...f, ...updates } : f);
    setFields(newFields);
    saveFields(newFields, activeTab);
  };

  const deleteField = (id: string) => {
    const newFields = fields.filter(f => f.id !== id);
    setFields(newFields);
    saveFields(newFields, activeTab);
  };

  const moveField = (id: string, direction: 'up' | 'down') => {
    const index = fields.findIndex(f => f.id === id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === fields.length - 1) return;

    const newFields = [...fields];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newFields[index], newFields[swapIndex]] = [newFields[swapIndex], newFields[index]];
    
    // Update order values
    newFields.forEach((field, idx) => {
      field.order = idx;
    });
    
    setFields(newFields);
    saveFields(newFields, activeTab);
  };

  const resetToDefaults = () => {
    if (confirm(`Reset ${activeTab === 'private' ? 'private lesson' : 'class'} intake form fields to defaults?`)) {
      setFields(defaultFields);
      saveFields(defaultFields, activeTab);
    }
  };

  if (loading) {
    return (
      <BusinessSettingsSubmenu>
        <div className="flex items-center justify-center h-64">
          <div className="w-16 h-16 border-4 border-[#3258A3] border-t-transparent rounded-full animate-spin"></div>
        </div>
      </BusinessSettingsSubmenu>
    );
  }

  return (
    <BusinessSettingsSubmenu>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Intake Forms</h1>
          <p className="text-gray-600 mt-2">Configure what information to collect when clients book sessions</p>
        </div>

        {lastSaved && (
          <div className="text-sm text-green-600 flex items-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Last saved: {lastSaved.toLocaleTimeString()}
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">How it works:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-800">
              <li>Private lessons and classes can have different intake requirements</li>
              <li>Check the "Required" box to make a field mandatory before booking</li>
              <li>Required fields must be filled before clients can complete their booking</li>
              <li>Changes sync immediately to your mobile apps</li>
            </ul>
          </div>
        </div>

        {/* Private Lessons Section */}
        <Card>
          <CardHeader className="bg-gradient-to-r from-[#3258A3] to-[#2A4A8C] text-white">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Private Lesson Intake Form</CardTitle>
                <p className="text-blue-100 text-sm mt-1">Fields required when booking private lessons</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setActiveTab('private');
                    resetToDefaults();
                  }}
                  className="px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                >
                  Reset to Defaults
                </button>
                <button
                  onClick={() => {
                    setActiveTab('private');
                    addField();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-[#3258A3] rounded-lg hover:bg-blue-50 transition-colors font-medium text-sm"
                >
                  <Plus className="h-4 w-4" />
                  Add Field
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {privateFields.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No fields configured. Click "Add Field" to create your first intake form field.
              </div>
            ) : (
              <div className="space-y-3">
                {privateFields.sort((a, b) => a.order - b.order).map((field, index) => (
                  <FieldEditor
                    key={field.id}
                    field={field}
                    index={index}
                    isEditing={editingField === field.id}
                    onEdit={() => setEditingField(editingField === field.id ? null : field.id)}
                    onUpdate={(updates) => {
                      setActiveTab('private');
                      updateField(field.id, updates);
                    }}
                    onDelete={() => {
                      setActiveTab('private');
                      deleteField(field.id);
                    }}
                    onMove={(direction) => {
                      setActiveTab('private');
                      moveField(field.id, direction);
                    }}
                    canMoveUp={index > 0}
                    canMoveDown={index < privateFields.length - 1}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Classes Section */}
        <Card>
          <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Class Intake Form</CardTitle>
                <p className="text-orange-100 text-sm mt-1">Fields required when registering for classes</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setActiveTab('class');
                    resetToDefaults();
                  }}
                  className="px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                >
                  Reset to Defaults
                </button>
                <button
                  onClick={() => {
                    setActiveTab('class');
                    addField();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-orange-600 rounded-lg hover:bg-orange-50 transition-colors font-medium text-sm"
                >
                  <Plus className="h-4 w-4" />
                  Add Field
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {classFields.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No fields configured. Click "Add Field" to create your first intake form field.
              </div>
            ) : (
              <div className="space-y-3">
                {classFields.sort((a, b) => a.order - b.order).map((field, index) => (
                  <FieldEditor
                    key={field.id}
                    field={field}
                    index={index}
                    isEditing={editingField === field.id}
                    onEdit={() => setEditingField(editingField === field.id ? null : field.id)}
                    onUpdate={(updates) => {
                      setActiveTab('class');
                      updateField(field.id, updates);
                    }}
                    onDelete={() => {
                      setActiveTab('class');
                      deleteField(field.id);
                    }}
                    onMove={(direction) => {
                      setActiveTab('class');
                      moveField(field.id, direction);
                    }}
                    canMoveUp={index > 0}
                    canMoveDown={index < classFields.length - 1}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </BusinessSettingsSubmenu>
  );
}

// Field Editor Component
function FieldEditor({
  field,
  index,
  isEditing,
  onEdit,
  onUpdate,
  onDelete,
  onMove,
  canMoveUp,
  canMoveDown,
}: {
  field: IntakeField;
  index: number;
  isEditing: boolean;
  onEdit: () => void;
  onUpdate: (updates: Partial<IntakeField>) => void;
  onDelete: () => void;
  onMove: (direction: 'up' | 'down') => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors bg-white">
      <div className="flex items-start gap-4">
        {/* Move buttons */}
        <div className="flex flex-col gap-1 pt-1">
          <button
            onClick={() => onMove('up')}
            disabled={!canMoveUp}
            className={`p-1 rounded ${canMoveUp ? 'text-gray-600 hover:bg-gray-100' : 'text-gray-300 cursor-not-allowed'}`}
            title="Move up"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            onClick={() => onMove('down')}
            disabled={!canMoveDown}
            className={`p-1 rounded ${canMoveDown ? 'text-gray-600 hover:bg-gray-100' : 'text-gray-300 cursor-not-allowed'}`}
            title="Move down"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="flex-1">
          {isEditing ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Field Label
                  </label>
                  <input
                    type="text"
                    value={field.label}
                    onChange={(e) => onUpdate({ label: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#3258A3] focus:border-transparent text-sm"
                    placeholder="e.g., Athlete Full Name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Field Type
                  </label>
                  <select
                    value={field.fieldType}
                    onChange={(e) => onUpdate({ fieldType: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#3258A3] focus:border-transparent text-sm"
                  >
                    <option value="text">Text</option>
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                    <option value="date">Date</option>
                    <option value="textarea">Text Area</option>
                    <option value="select">Dropdown</option>
                    <option value="number">Number</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Section
                  </label>
                  <select
                    value={field.section}
                    onChange={(e) => onUpdate({ section: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#3258A3] focus:border-transparent text-sm"
                  >
                    <option value="athlete">Athlete Info</option>
                    <option value="parent">Parent/Guardian</option>
                    <option value="emergency">Emergency Contact</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Placeholder (Optional)
                  </label>
                  <input
                    type="text"
                    value={field.placeholder || ''}
                    onChange={(e) => onUpdate({ placeholder: e.target.value })}
                    placeholder="Enter placeholder text..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#3258A3] focus:border-transparent text-sm"
                  />
                </div>
              </div>

              {field.fieldType === 'select' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Options (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={field.options?.join(', ') || ''}
                    onChange={(e) => onUpdate({ options: e.target.value.split(',').map(o => o.trim()).filter(o => o) })}
                    placeholder="e.g., Beginner, Intermediate, Advanced"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#3258A3] focus:border-transparent text-sm"
                  />
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`required-${field.id}`}
                  checked={field.required}
                  onChange={(e) => onUpdate({ required: e.target.checked })}
                  className="w-4 h-4 text-[#3258A3] border-gray-300 rounded focus:ring-[#3258A3]"
                />
                <label htmlFor={`required-${field.id}`} className="text-sm font-medium text-gray-700">
                  Required field - clients must fill this before booking
                </label>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-900">{field.label}</span>
                <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                  {field.fieldType}
                </span>
                <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded">
                  {field.section}
                </span>
                {field.required && (
                  <span className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded font-medium">
                    Required
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
            title={isEditing ? "Collapse" : "Edit field"}
          >
            {isEditing ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            )}
          </button>
          <button
            onClick={() => {
              if (confirm('Delete this field?')) {
                onDelete();
              }
            }}
            className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Delete field"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
