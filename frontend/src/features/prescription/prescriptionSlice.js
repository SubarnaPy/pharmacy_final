import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { uploadPrescriptionAPI, fetchOcrResultAPI, fetchHistoryAPI, fetchPrescriptionAPI } from './prescriptionAPI';

// Upload prescription and get back an ID
export const uploadPrescription = createAsyncThunk(
  'prescription/upload',
  async (file, thunkAPI) => {
    const response = await uploadPrescriptionAPI(file);
    return response.data.data.prescriptionId;
  }
);

// Fetch OCR result by prescription ID
export const getOcrResult = createAsyncThunk(
  'prescription/getOcr',
  async (prescriptionId, thunkAPI) => {
    const response = await fetchOcrResultAPI(prescriptionId);
    return response.data.data.ocrText;
  }
);

export const fetchHistory = createAsyncThunk(
  'prescription/fetchHistory',
  async (_, thunkAPI) => {
    const response = await fetchHistoryAPI();
    return response.data.data.prescriptions;
  }
);

export const fetchById = createAsyncThunk(
  'prescription/fetchById',
  async (id, thunkAPI) => {
    const response = await fetchPrescriptionAPI(id);
    return response.data.data.prescription;
  }
);

const prescriptionSlice = createSlice({
  name: 'prescription',
  initialState: { prescriptionId: null, ocrText: '', history: [], currentPrescription: null, status: 'idle', error: null },
  reducers: {
    clearOcr(state) {
      state.ocrText = '';
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // history
      .addCase(fetchHistory.pending, (state) => { state.status = 'loading'; })
      .addCase(fetchHistory.fulfilled, (state, action) => { state.status = 'succeeded'; state.history = action.payload; })
      .addCase(fetchHistory.rejected, (state, action) => { state.status = 'failed'; state.error = action.error.message; })
      // fetch by id
      .addCase(fetchById.pending, (state) => { state.status = 'loading'; })
      .addCase(fetchById.fulfilled, (state, action) => { state.status = 'succeeded'; state.currentPrescription = action.payload; })
      .addCase(fetchById.rejected, (state, action) => { state.status = 'failed'; state.error = action.error.message; })
      // upload and OCR existing cases...
      .addCase(uploadPrescription.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(uploadPrescription.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.prescriptionId = action.payload;
      })
      .addCase(uploadPrescription.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      .addCase(getOcrResult.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(getOcrResult.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.ocrText = action.payload;
      })
      .addCase(getOcrResult.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      });
  }
});

export const { clearOcr } = prescriptionSlice.actions;
export default prescriptionSlice.reducer;
