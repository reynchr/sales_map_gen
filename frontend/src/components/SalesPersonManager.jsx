import React, { useState } from 'react';
import { Plus, Trash2, PencilLine } from 'lucide-react';

const SalesPersonManager = ({ salesPeople, onSalesPersonAdd, onSalesPersonRemove, onSalesPersonEdit }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });
  const [errors, setErrors] = useState({});
  const [editingId, setEditingId] = useState(null);

  const validateForm = () => {
    const newErrors = {};
    
    // First Name validation
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    // Last Name validation
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Phone validation
    const phoneRegex = /^\+?1?\d{9,15}$/;
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!phoneRegex.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      if (editingId !== null) {
        onSalesPersonEdit(editingId, formData);
        setEditingId(null);
      } else {
        onSalesPersonAdd({ ...formData, id: Date.now().toString() });
      }
      
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
      });
    }
  };

  const handleEdit = (person) => {
    setFormData({
      firstName: person.firstName,
      lastName: person.lastName,
      email: person.email,
      phone: person.phone,
    });
    setEditingId(person.id);
  };

  const handleCancel = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
    });
    setEditingId(null);
    setErrors({});
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">
        {editingId !== null ? 'Edit Sales Person' : 'Add Sales Person'}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <input
              type="text"
              placeholder="First Name"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              className={`w-full border p-2 rounded ${errors.firstName ? 'border-red-500' : ''}`}
            />
            {errors.firstName && (
              <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>
            )}
          </div>

          <div>
            <input
              type="text"
              placeholder="Last Name"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              className={`w-full border p-2 rounded ${errors.lastName ? 'border-red-500' : ''}`}
            />
            {errors.lastName && (
              <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>
            )}
          </div>

          <div>
            <input
              type="email"
              placeholder="Email Address"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={`w-full border p-2 rounded ${errors.email ? 'border-red-500' : ''}`}
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email}</p>
            )}
          </div>

          <div>
            <input
              type="tel"
              placeholder="Phone Number"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className={`w-full border p-2 rounded ${errors.phone ? 'border-red-500' : ''}`}
            />
            {errors.phone && (
              <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
            )}
          </div>
        </div>

        <div className="flex gap-4">
          {editingId !== null ? (
            <>
              <button
                type="submit"
                className="bg-green-500 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-green-600"
              >
                Save Changes
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="bg-gray-500 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-gray-600"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="submit"
              className="bg-blue-500 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-600"
            >
              <Plus className="w-4 h-4" />
              Add Sales Person
            </button>
          )}
        </div>
      </form>

      <div className="space-y-2">
        {salesPeople.map((person) => (
          <div
            key={person.id}
            className="flex items-center justify-between p-3 bg-gray-50 rounded"
          >
            <div>
              <span className="font-medium">
                {person.firstName} {person.lastName}
              </span>
              <div className="text-sm text-gray-600">
                {person.email} | {person.phone}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => handleEdit(person)}
                className="text-blue-500 hover:text-blue-700"
                disabled={editingId !== null && editingId !== person.id}
              >
                <PencilLine className="w-4 h-4" />
              </button>
              <button
                onClick={() => onSalesPersonRemove(person.id)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SalesPersonManager;