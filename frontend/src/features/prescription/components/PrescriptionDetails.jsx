import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { fetchById } from '../prescriptionSlice';

function PrescriptionDetails() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { currentPrescription, status, error } = useSelector(state => state.prescription);

  useEffect(() => {
    if (id) dispatch(fetchById(id));
  }, [dispatch, id]);

  if (status === 'loading') return <div>Loading details...</div>;
  if (status === 'failed') return <div className="text-red-500">{error}</div>;
  if (!currentPrescription) return null;

  const { _id, createdAt, ocrText, originalFilename } = currentPrescription;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Prescription Details</h2>
      <p><strong>ID:</strong> {_id}</p>
      <p><strong>Uploaded:</strong> {new Date(createdAt).toLocaleString()}</p>
      <p><strong>Filename:</strong> {originalFilename}</p>
      <div className="mt-4">
        <h3 className="text-xl mb-2">Extracted Text</h3>
        <textarea value={ocrText} readOnly className="w-full h-64 border p-2" />
      </div>
    </div>
  );
}

export default PrescriptionDetails;
