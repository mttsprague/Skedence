'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { BusinessSettingsSubmenu } from '@/components/business-settings-submenu';
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
    saveFields(newFields);
  };

  const resetToDefaults = () => {
    if (confirm('Are you sure you want to reset to default fields? This will remove all custom fields.')) {
      setFields(defaultFields);
      saveFields(defaultFields);
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Intake Forms</h1>
            <p className="text-gray-600 mt-2">Configure what information to collect from new clients</p>
          </div>
          <div className="flex items-center gap-4">
            {lastSaved && (
              <div className="text-sm text-gray-500">
                Last saved: {lastSaved.toLocaleTimeString()}
              </div>
            )}
            <button
              onClick={resetToDefaults}
              className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Reset to Defaults
            </button>
            <button
              onClick={addField}
              className="flex items-center gap-2 px-6 py-2 bg-[#3258A3] text-white rounded-lg hover:bg-[#2A4A8C] transition-colors font-medium"
            >
              <Plus className="h-5 w-5" />
              Add Field
            </button>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">How it works:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-800">
              <li>These fields will appear when clients are booking a session</li>
              <li>Fields are also shown in the client's Edit Profile section</li>
              <li>Required fields must be filled before booking can be completed</li>
              <li>Changes sync immediately to your mobile apps</li>
            </ul>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Form Fields</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {fields.sort((a, b) => a.order - b.order).map((field, index) => (
                <div
                  key={field.id}
                  className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex flex-col gap-2 mt-2">
                    <button
                      onClick={() => moveField(field.id, 'up')}
                      disabled={index === 0}
                      className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <GripVertical className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => moveField(field.id, 'down')}
                      disabled={index === fields.length - 1}
                      className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <GripVertical className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Field Label
                      </label>
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => updateField(field.id, { label: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#3258A3] focus:border-transparent text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Field Type
                      </label>
                      <select
                        value={field.fieldType}
                        onChange={(e) => updateField(field.id, { fieldType: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#3258A3] focus:border-transparent text-sm"
                      >
                        <option value="text">Text</option>
                        <option value="email">Email</option>
                        <option value="phone">Phone</option>
                        <option value="date">Date</option>
                        <option value="number">Number</option>
                        <option value="textarea">Textarea</option>
                        <option value="select">Select (Dropdown)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Section
                      </label>
                      <select
                        value={field.section}
                        onChange={(e) => updateField(field.id, { section: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#3258A3] focus:border-transparent text-sm"
                      >
                        <option value="athlete">Athlete Info</option>
                        <option value="parent">Parent/Guardian</option>
                        <option value="emergency">Emergency Contact</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Placeholder Text (Optional)
                      </label>
                      <input
                        type="text"
                        value={field.placeholder || ''}
                        onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                        placeholder="Enter placeholder text..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#3258A3] focus:border-transparent text-sm"
                      />
                    </div>

                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) => updateField(field.id, { required: e.target.checked })}
                          className="w-4 h-4 text-[#3258A3] border-gray-300 rounded focus:ring-[#3258A3]"
                        />
                        <span className="text-sm font-medium text-gray-700">Required</span>
                      </label>
                    </div>

                    {field.fieldType === 'select' && (
                      <div className="md:col-span-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Options (comma-separated)
                        </label>
                        <input
                          type="text"
                          value={field.options?.join(', ') || ''}
                          onChange={(e) => updateField(field.id, { 
                            options: e.target.value.split(',').map(o => o.trim()).filter(o => o) 
                          })}
                          placeholder="Option 1, Option 2, Option 3"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#3258A3] focus:border-transparent text-sm"
                        />
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => deleteField(field.id)}
                    className="mt-2 text-red-600 hover:text-red-800 transition-colors"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              ))}

              {fields.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  No fields configured. Click "Add Field" to create your first intake form field.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </BusinessSettingsSubmenu>
  );
}
