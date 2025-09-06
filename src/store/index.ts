import { configureStore } from '@reduxjs/toolkit';
import agentSlice from './slices/agentSlice';
import chatSlice from './slices/chatSlice';
import uiSlice from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    agent: agentSlice,
    chat: chatSlice,
    ui: uiSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// 类型化的hooks
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;