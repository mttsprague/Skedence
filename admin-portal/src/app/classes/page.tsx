'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Calendar, Clock, User, MapPin, Users, Plus, Edit2, Trash2, X } from 'lucide-react';
import { format } from 'date-fns';
import { Location } from '@/types/location';

interface Trainer {
  id: string;
  firstName: string;
  lastName: string;
}

interface GroupClass {
  id: string;
  orgId: string;
  title: string;
  description?: string;
  trainerId: string;
  startTime: Timestamp;
  endTime: Timestamp;
  locationId?: string;
  maxCapacity: number;
  currentParticipants: number; // Matches iOS GroupClass schema
  isRecurring: boolean;
  recurringPattern?: string;
}

export default function ClassesPage() {
  const { orgId } = useAuth();
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [classes, setClasses] = useState<GroupClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingClass, setEditingClass] = useState<GroupClass | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({
    title: '',
    description: '',
    trainerId: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00',
    endTime: '10:00',
    locationId: '',
    maxCapacity: 10,
    isRecurring: false,
    recurringPattern: 'weekly',
  });

  useEffect(() => {
    if (!orgId) return;

    async function loadData() {
      try {
        // Load trainers from trainers collection
        const trainersQuery = query(
          collection(db, 'trainers'),
          where('orgId', '==', orgId!)
        );
        const trainersSnapshot = await getDocs(trainersQuery);
        const trainersData = trainersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Trainer[];
        setTrainers(trainersData);
        if (trainersData.length > 0 && !form.trainerId) {
          setForm(prev => ({ ...prev, trainerId: trainersData[0].id }));
        }

        const locationsQuery = query(
          collection(db, 'locations'),
          where('orgId', '==', orgId!),
          where('isActive', '==', true)
        );
        const locationsSnapshot = await getDocs(locationsQuery);
        const locationsData = locationsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Location[];
        setLocations(locationsData);

        // Load classes
        const classesQuery = query(
          collection(db, 'classes'),
          where('orgId', '==', orgId)
        );
        const classesSnapshot = await getDocs(classesQuery);
        const classesData = classesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as GroupClass[];
        setClasses(classesData.sort((a, b) => a.startTime.seconds - b.startTime.seconds));
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [orgId]);

  const handleSubmit = async () => {
    if (!orgId || !form.title || !form.trainerId || !form.locationId) {
      alert('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const startDateTime = new Date(`${form.date}T${form.startTime}`);
      const endDateTime = new Date(`${form.date}T${form.endTime}`);

      const classData = {
        orgId,
        title: form.title,
        description: form.description || null,
        trainerId: form.trainerId,
        startTime: Timestamp.fromDate(startDateTime),
        endTime: Timestamp.fromDate(endDateTime),
        locationId: form.locationId,
        maxCapacity: form.maxCapacity,
        currentParticipants: 0,
        isRecurring: form.isRecurring,
        recurringPattern: form.isRecurring ? form.recurringPattern : null,
      };

      if (editingClass) {
        await updateDoc(doc(db, 'classes', editingClass.id), classData);
        setClasses(classes.map(c => c.id === editingClass.id ? { ...classData, id: editingClass.id, currentParticipants: editingClass.currentParticipants } as GroupClass : c));
      } else {
        const docRef = await addDoc(collection(db, 'classes'), classData);
        setClasses([...classes, { ...classData, id: docRef.id, currentParticipants: 0 } as GroupClass].sort((a, b) => a.startTime.seconds - b.startTime.seconds));
      }

      resetForm();
    } catch (error) {
      console.error('Error saving class:', error);
      alert('Error saving class');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (cls: GroupClass) => {
    setEditingClass(cls);
    setForm({
      title: cls.title,
      description: cls.description || '',
      trainerId: cls.trainerId,
      date: format(cls.startTime.toDate(), 'yyyy-MM-dd'),
      startTime: format(cls.startTime.toDate(), 'HH:mm'),
      endTime: format(cls.endTime.toDate(), 'HH:mm'),
      locationId: cls.locationId || '',
      maxCapacity: cls.maxCapacity,
      isRecurring: cls.isRecurring,
      recurringPattern: cls.recurringPattern || 'weekly',
    });
    setShowForm(true);
  };

  const handleDelete = async (classId: string) => {
    if (!confirm('Are you sure you want to delete this class?')) return;

    try {
      await deleteDoc(doc(db, 'classes', classId));
      setClasses(classes.filter(c => c.id !== classId));
    } catch (error) {
      console.error('Error deleting class:', error);
      alert('Error deleting class');
    }
  };

  const resetForm = () => {
    setForm({
      title: '',
      description: '',
      trainerId: trainers.length > 0 ? trainers[0].id : '',
      date: format(new Date(), 'yyyy-MM-dd'),
      startTime: '09:00',
      endTime: '10:00',
      locationId: '',
      maxCapacity: 10,
      isRecurring: false,
      recurringPattern: 'weekly',
    });
    setEditingClass(null);
    setShowForm(false);
  };

  const getTrainerName = (trainerId: string) => {
    const trainer = trainers.find(t => t.id === trainerId);
    return trainer ? `${trainer.firstName} ${trainer.lastName}` : 'Unknown';
  };

  const getLocationName = (locationId?: string) => {
    if (!locationId) return 'No location';
    const location = locations.find(l => l.id === locationId);
    return location ? location.name : 'Unknown';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Class Management</h1>
            <p className="text-gray-600 mt-2">Create and manage group classes</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-[#3258A3] text-white rounded-lg hover:bg-[#2A4A8C] transition-colors"
          >
            {showForm ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            {showForm ? 'Cancel' : 'New Class'}
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-[#3258A3] border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : (
          <>
            {/* Class Form */}
            {showForm && (
              <Card>
                <CardHeader>
                  <CardTitle>{editingClass ? 'Edit Class' : 'Create New Class'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Class Title *
                      </label>
                      <input
                        type="text"
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        placeholder="e.g., Morning Yoga"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3258A3]"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        placeholder="Optional class description"
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3258A3]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Trainer *
                      </label>
                      <select
                        value={form.trainerId}
                        onChange={(e) => setForm({ ...form, trainerId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3258A3]"
                      >
                        {trainers.map(trainer => (
                          <option key={trainer.id} value={trainer.id}>
                            {trainer.firstName} {trainer.lastName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Capacity *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={form.maxCapacity}
                        onChange={(e) => setForm({ ...form, maxCapacity: parseInt(e.target.value) || 1 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3258A3]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date *
                      </label>
                      <input
                        type="date"
                        value={form.date}
                        onChange={(e) => setForm({ ...form, date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3258A3]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Start Time *
                        </label>
                        <input
                          type="time"
                          value={form.startTime}
                          onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3258A3]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          End Time *
                        </label>
                        <input
                          type="time"
                          value={form.endTime}
                          onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3258A3]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Location *
                      </label>
                      {locations.length === 0 ? (
                        <div className="w-full px-3 py-2 border border-yellow-300 bg-yellow-50 rounded-lg text-sm text-yellow-800">
                          No locations found. Please add a location in Settings first.
                        </div>
                      ) : (
                        <select
                          value={form.locationId}
                          onChange={(e) => setForm({ ...form, locationId: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3258A3]"
                          required
                        >
                          <option value="">Select a location</option>
                          {locations.map(location => (
                            <option key={location.id} value={location.id}>
                              {location.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.isRecurring}
                          onChange={(e) => setForm({ ...form, isRecurring: e.target.checked })}
                          className="w-4 h-4 text-[#3258A3] border-gray-300 rounded focus:ring-[#3258A3]"
                        />
                        <span className="text-sm font-medium text-gray-700">Recurring</span>
                      </label>
                      {form.isRecurring && (
                        <select
                          value={form.recurringPattern}
                          onChange={(e) => setForm({ ...form, recurringPattern: e.target.value })}
                          className="px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3258A3]"
                        >
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                        </select>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={handleSubmit}
                      disabled={saving}
                      className="flex items-center gap-2 px-6 py-2 bg-[#3258A3] text-white rounded-lg hover:bg-[#2A4A8C] disabled:opacity-50 transition-colors"
                    >
                      {saving ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Plus className="h-5 w-5" />
                          {editingClass ? 'Update Class' : 'Create Class'}
                        </>
                      )}
                    </button>
                    <button
                      onClick={resetForm}
                      className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Classes List */}
            <div className="grid grid-cols-1 gap-4">
              {classes.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No classes scheduled</p>
                    <p className="text-sm text-gray-400 mt-1">Click "New Class" to create one</p>
                  </CardContent>
                </Card>
              ) : (
                classes.map(cls => (
                  <Card key={cls.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-start gap-3">
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-gray-900">{cls.title}</h3>
                              {cls.description && (
                                <p className="text-sm text-gray-600 mt-1">{cls.description}</p>
                              )}
                              
                              <div className="flex flex-wrap gap-4 mt-3">
                                <div className="flex items-center gap-1 text-sm text-gray-600">
                                  <User className="h-4 w-4" />
                                  {getTrainerName(cls.trainerId)}
                                </div>
                                <div className="flex items-center gap-1 text-sm text-gray-600">
                                  <Calendar className="h-4 w-4" />
                                  {format(cls.startTime.toDate(), 'EEE, MMM d, yyyy')}
                                </div>
                                <div className="flex items-center gap-1 text-sm text-gray-600">
                                  <Clock className="h-4 w-4" />
                                  {format(cls.startTime.toDate(), 'h:mm a')} - {format(cls.endTime.toDate(), 'h:mm a')}
                                </div>
                                {cls.locationId && (
                                  <div className="flex items-center gap-1 text-sm text-gray-600">
                                    <MapPin className="h-4 w-4" />
                                    {getLocationName(cls.locationId)}
                                  </div>
                                )}
                                <div className="flex items-center gap-1 text-sm text-gray-600">
                                  <Users className="h-4 w-4" />
                                  {cls.currentParticipants} / {cls.maxCapacity}
                                </div>
                              </div>

                              {cls.isRecurring && (
                                <span className="inline-block mt-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                                  Recurring ({cls.recurringPattern})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(cls)}
                            className="p-2 text-gray-400 hover:text-[#3258A3] hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(cls.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
