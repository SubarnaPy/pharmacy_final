import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getNearbyPharmaciesAPI } from './pharmacyAPI';

// Fetch nearby pharmacies
export const fetchNearbyPharmacies = createAsyncThunk(
  'pharmacy/fetchNearby',
  async ({ lat, lng }, thunkAPI) => {
    const response = await getNearbyPharmaciesAPI({ lat, lng });
    return response.data.data.pharmacies;
  }
);

const pharmacySlice = createSlice({
  name: 'pharmacy',
  initialState: { list: [], status: 'idle', error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchNearbyPharmacies.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchNearbyPharmacies.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list = action.payload;
      })
      .addCase(fetchNearbyPharmacies.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      });
  }
});

export default pharmacySlice.reducer;
