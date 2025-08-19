import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { verify2FA } from '../authSlice';

function TwoFactorForm() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const requires2FA = useSelector(state => state.auth.requires2FA);
  const twoFactorToken = useSelector(state => state.auth.twoFactorToken);
  const method = useSelector(state => state.auth.method);
  const status = useSelector(state => state.auth.status);
  const error = useSelector(state => state.auth.error);
  const [code, setCode] = useState('');

  useEffect(() => {
    if (!requires2FA) {
      navigate('/login');
    }
  }, [requires2FA, navigate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(verify2FA({ twoFactorCode: code }))
      .unwrap()
      .then(() => {
        navigate('/');
      })
      .catch(() => {
        // Error handled in state
      });
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto p-4">
      <h2 className="text-2xl mb-4">Two-Factor Authentication</h2>
      <p className="mb-4">Enter the verification code sent via {method}.</p>
      <input
        type="text"
        placeholder="Verification Code"
        value={code}
        onChange={e => setCode(e.target.value)}
        className="border p-2 mb-4 w-full"
      />
      {error && <p className="text-red-500 mb-2">{error}</p>}
      <button type="submit" className="bg-blue-500 text-white py-2 px-4">
        {status === 'loading' ? 'Verifying...' : 'Verify'}
      </button>
    </form>
  );
}

export default TwoFactorForm;
