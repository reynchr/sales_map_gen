// Complete the MapGenerator component that was cut off
import React, { useState } from 'react'
import { Download, Upload, Map, Plus, Trash2, Save } from 'lucide-react'
import DualListBox from './DualListBox'
import SalesPersonManager from './SalesPersonManager'

function MapGenerator() {
  // State for sales people
  const [salesPeople, setSalesPeople] = useState([]);
  
  // State for regions
  const [regions, setRegions] = useState([]);
  const [currentRegion, setCurrentRegion] = useState({
    name: '',
    salesPersonId: '',
    color: '#000000',
    states: []
  });
  
  // State for editing
  const [editingIndex, setEditingIndex] = useState(null);

  // State for export settings
  const [exportSettings, setExportSettings] = useState({
    width: 2000,
    height: 1500,
    dpi: 300
  });

  // List of all available states and provinces
  const allTerritories = {
    "US States": [
      "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
      "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
      "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
      "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
      "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
      "New Hampshire", "New Jersey", "New Mexico", "New York",
      "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
      "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
      "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
      "West Virginia", "Wisconsin", "Wyoming"
    ],
    "Canadian Provinces": [
      "Alberta", "British Columbia", "Manitoba", "New Brunswick",
      "Newfoundland and Labrador", "Nova Scotia", "Ontario",
      "Prince Edward Island", "Quebec", "Saskatchewan",
      "Northwest Territories", "Nunavut", "Yukon"
    ]
  };

  // Sales Person Management Functions
  const handleSalesPersonAdd = (person) => {
    setSalesPeople([...salesPeople, person]);
  };

  const handleSalesPersonRemove = (id) => {
    // Remove the sales person
    setSalesPeople(salesPeople.filter(person => person.id !== id));
    
    // Clear the sales person from any regions using them
    setRegions(regions.map(region => {
      if (region.salesPersonId === id) {
        return { ...region, salesPersonId: '' };
      }
      return region;
    }));
    
    // Clear from current region if being edited
    if (currentRegion.salesPersonId === id) {
      setCurrentRegion({ ...currentRegion, salesPersonId: '' });
    }
  };

  const handleSalesPersonEdit = (id, updatedPerson) => {
    setSalesPeople(salesPeople.map(person => 
      person.id === id ? { ...updatedPerson, id } : person
    ));
  };

  // Region Management Functions
  const handleEditRegion = (index) => {
    setCurrentRegion(regions[index]);
    setEditingIndex(index);
  };

  const handleSaveEdit = () => {
    if (!currentRegion.name || !currentRegion.salesPersonId) {
      alert('Please fill in all required fields');
      return;
    }
    const newRegions = [...regions];
    newRegions[editingIndex] = currentRegion;
    setRegions(newRegions);
    setEditingIndex(null);
    setCurrentRegion({
      name: '',
      salesPersonId: '',
      color: '#000000',
      states: []
    });
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setCurrentRegion({
      name: '',
      salesPersonId: '',
      color: '#000000',
      states: []
    });
  };

  const handleAddRegion = () => {
    if (!currentRegion.name || !currentRegion.salesPersonId) {
      alert('Please fill in all required fields');
      return;
    }
    setRegions([...regions, currentRegion]);
    setCurrentRegion({
      name: '',
      salesPersonId: '',
      color: '#000000',
      states: []
    });
  };

  const handleRemoveRegion = (index) => {
    const newRegions = [...regions];
    newRegions.splice(index, 1);
    setRegions(newRegions);
    if (editingIndex === index) {
      handleCancelEdit();
    }
  };

  // Generate and download map
  const handleGenerateMap = async () => {
    try {
      const regionsWithSalesPeople = regions.map(region => {
        const salesPerson = salesPeople.find(sp => sp.id === region.salesPersonId);
        return {
          name: region.name,
          salesRep: `${salesPerson.firstName} ${salesPerson.lastName}`,
          salesNumber: salesPerson.phone,
          color: region.color,
          states: region.states
        };
      });

      console.log('Sending request to backend with data:', {
        regions: regionsWithSalesPeople,
        exportSettings
      });

      // First, send a preflight request
      const checkResponse = await fetch('http://localhost:5001/generate-map', {
        method: 'OPTIONS'
      });

      // Then send the actual request
      const response = await fetch('http://localhost:5001/generate-map', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          regions: regionsWithSalesPeople,
          exportSettings
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate map');
      }
      
      // Download the generated map
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'generated_map.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Full error:', error);
      alert('Error generating map: ' + error.message);
    }
  };

  const handleExportRegions = async () => {
    try {
      // Prepare the export data with both sales people and regions
      const exportData = {
        salesPeople,
        regions: regions.reduce((acc, region) => {
          const salesPerson = salesPeople.find(sp => sp.id === region.salesPersonId);
          acc[region.name] = {
            territories: region.states,
            color: region.color,
            salesPersonId: region.salesPersonId
          };
          return acc;
        }, {})
      };

      const response = await fetch('http://localhost:5001/export-regions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(exportData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to export regions');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      a.download = `sales_regions_${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error exporting regions:', error);
      alert('Error exporting regions: ' + error.message);
    }
  };

  const handleImportRegions = async (event) => {
    try {
      const file = event.target.files[0];
      if (!file) return;
      
      if (!file.name.endsWith('.json')) {
        alert('Please select a JSON file');
        return;
      }
      
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('http://localhost:5001/import-regions', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to import regions');
      }
      
      const data = await response.json();
      
      // Set sales people first
      setSalesPeople(data.salesPeople || []);
      
      // Then set regions
      const newRegions = Object.entries(data.regions || {}).map(([name, details]) => ({
        name,
        salesPersonId: details.salesPersonId,
        color: details.color,
        states: details.territories
      }));
      setRegions(newRegions);
      
      alert('Data imported successfully!');
      
    } catch (error) {
      console.error('Error importing regions:', error);
      alert('Error importing regions: ' + error.message);
    } finally {
      // Reset the file input
      event.target.value = '';
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Map Region Generator</h1>
        <div className="flex gap-4">
          <input
            id="import-input"
            type="file"
            accept=".json"
            onChange={handleImportRegions}
            className="hidden"
          />
          <button 
            onClick={() => document.getElementById('import-input').click()}
            className="bg-blue-500 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-600"
          >
            <Upload className="w-4 h-4" />
            Import Data
          </button>
          <button 
            onClick={handleExportRegions}
            className="bg-purple-500 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-purple-600"
            disabled={regions.length === 0 || salesPeople.length === 0}
          >
            <Save className="w-4 h-4" />
            Export Data
          </button>
        </div>
      </div>

      {/* Sales Person Manager */}
      <SalesPersonManager
        salesPeople={salesPeople}
        onSalesPersonAdd={handleSalesPersonAdd}
        onSalesPersonRemove={handleSalesPersonRemove}
        onSalesPersonEdit={handleSalesPersonEdit}
      />

      {/* Add New Region Form */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">
          {editingIndex !== null ? 'Edit Region' : 'Add New Region'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <input
            type="text"
            placeholder="Region Name"
            className="border p-2 rounded"
            value={currentRegion.name}
            onChange={(e) => setCurrentRegion({...currentRegion, name: e.target.value})}
          />
          <select
            className="border p-2 rounded"
            value={currentRegion.salesPersonId}
            onChange={(e) => setCurrentRegion({...currentRegion, salesPersonId: e.target.value})}
          >
            <option value="">Select Sales Person</option>
            {salesPeople.map(person => (
              <option key={person.id} value={person.id}>
                {person.firstName} {person.lastName} ({person.email})
              </option>
            ))}
          </select>
          <input
            type="color"
            className="h-10"
            value={currentRegion.color}
            onChange={(e) => setCurrentRegion({...currentRegion, color: e.target.value})}
          />
        </div>

        {/* Territory Selection */}
        <div className="mb-4">
          <h3 className="font-semibold mb-2">Select Territories</h3>
          <DualListBox
            available={[...allTerritories["US States"], ...allTerritories["Canadian Provinces"]]}
            selected={currentRegion.states}
            onSelectionChange={(newSelected) => setCurrentRegion({ ...currentRegion, states: newSelected })}
          />
        </div>

        <div className="flex gap-4">
          {editingIndex !== null ? (
            <>
              <button onClick={handleSaveEdit} className="bg-green-500 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-green-600">
                <Save className="w-4 h-4" />
                Save Changes
              </button>
              <button onClick={handleCancelEdit} className="bg-gray-500 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-gray-600">
                Cancel
              </button>
            </>
          ) : (
            <button 
              onClick={handleAddRegion} 
              className="bg-blue-500 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-600"
              disabled={salesPeople.length === 0}
            >
              <Plus className="w-4 h-4" />
              Add Region
            </button>
          )}
        </div>
      </div>

      {/* Current Regions List */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Current Regions</h2>
        <div className="space-y-2">
          {regions.map((region, index) => {
            const salesPerson = salesPeople.find(sp => sp.id === region.salesPersonId);
            return (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <span className="font-medium">{region.name}</span>
                  <span className="mx-2">-</span>
                  <span>{salesPerson ? `${salesPerson.firstName} ${salesPerson.lastName}` : 'No Sales Person'}</span>
                  <div className="text-sm text-gray-600">
                    States: {region.states.join(', ')}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div
                    className="w-6 h-6 rounded border"
                    style={{backgroundColor: region.color}}
                  />
                  <button
                    onClick={() => handleEditRegion(index)}
                    className="text-blue-500 hover:text-blue-700"
                    disabled={editingIndex !== null && editingIndex !== index}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleRemoveRegion(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button 
          onClick={handleGenerateMap} 
          className="bg-green-500 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-green-600" 
          disabled={regions.length === 0}
        >
          <Map className="w-4 h-4" />
          Generate Map
        </button>
      </div>
    </div>
  );
}

export default MapGenerator;