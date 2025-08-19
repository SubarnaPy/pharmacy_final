import React from 'react';

function PrescriptionViewer({ imageSrc, extractedData }) {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">Prescription Viewer</h1>
      {imageSrc && (
        <div className="mb-4">
          <img src={imageSrc} alt="Uploaded Prescription" className="w-full border" />
        </div>
      )}
      {extractedData ? (
        <pre className="bg-gray-100 p-4 rounded">{JSON.stringify(extractedData, null, 2)}</pre>
      ) : (
        <p>No prescription data extracted yet.</p>
      )}
    </div>
  );
}

export default PrescriptionViewer;
