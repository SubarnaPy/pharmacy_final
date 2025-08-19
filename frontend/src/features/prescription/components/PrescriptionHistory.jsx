import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchHistory } from '../prescriptionSlice';

function PrescriptionHistory() {
  const dispatch = useDispatch();
  const { history, status, error } = useSelector(state => state.prescription);

  useEffect(() => {
    dispatch(fetchHistory());
  }, [dispatch]);

  if (status === 'loading') return <div>Loading prescriptions...</div>;
  if (status === 'failed') return <div className="text-red-500">{error}</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">My Prescriptions</h2>
      {history.length === 0 ? (
        <p>No prescriptions uploaded yet.</p>
      ) : (
        <ul className="space-y-2">
          {history.map(prescription => (
            <li key={prescription._id} className="border p-4 rounded-lg flex justify-between items-center">
              <div>
                <p className="font-semibold">Prescription Number: {prescription.prescriptionNumber || prescription._id}</p>
                <p className="text-gray-600">Uploaded: {new Date(prescription.createdAt).toLocaleString()}</p>
                <p className="text-gray-600">Status: {prescription.status?.current}</p>
                <p className="text-gray-600">OCR Status: {prescription.ocrData?.processingStatus}</p>
                <p className="text-gray-600">Priority: {prescription.priority}</p>
                <p className="text-gray-600">Validated: {prescription.validationResults?.isValid ? 'Yes' : 'No'}</p>
                <p className="text-gray-600">Validation Flags: {prescription.validationResults?.flags?.length || 0}</p>
              </div>
              <Link to={`/prescriptions/${prescription._id}`} className="text-blue-500 hover:underline">
                View Details
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default PrescriptionHistory;
