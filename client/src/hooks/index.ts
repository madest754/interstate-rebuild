/**
 * Hooks Index
 * 
 * Central export for all custom hooks.
 */

// Authentication
export { useAuth, useUser } from './useAuth';

// Calls
export { 
  useCalls, 
  useActiveCalls, 
  useCall, 
  useCallMutations,
  useRecentlyCompletedCalls,
  type Call,
  type CallAssignment,
  type InternalNote,
} from './useCalls';

// Members
export {
  useMembers,
  useMember,
  useCurrentMember,
  useMemberSearch,
  useDispatchers,
  useCoordinators,
  useMemberMutations,
  type Member,
} from './useMembers';

// Reference Data
export {
  useHighways,
  useHighwayExits,
  useHighwayMutations,
  useCarMakes,
  useCarModels,
  useVehicleMutations,
  useAgencies,
  useAgencyMutations,
  useProblemCodes,
  useProblemCodeMutations,
  useImportantPhones,
  usePhoneCategories,
  useImportantPhoneMutations,
  usePrefetchReferenceData,
  type Highway,
  type HighwayExit,
  type CarMake,
  type CarModel,
  type Agency,
  type ProblemCode,
  type ImportantPhone,
  type PhoneCategory,
} from './useReferenceData';

// Schedules
export {
  useSchedules,
  useScheduleMutations,
  useShiftOverrides,
  useMyShiftOverrides,
  useShiftOverrideMutations,
  useQueueSessions,
  useQueueMembers,
  useDispatcherStatus,
  useQueueMutations,
  getDayName,
  formatTime,
  getCurrentSchedule,
  type Schedule,
  type ShiftOverride,
  type QueueSession,
} from './useSchedules';

// Drafts
export {
  useDrafts,
  useAllDrafts,
  useDraftMutations,
  useLocalDraft,
  useDraftManager,
  type Draft,
} from './useDrafts';

// Toast
export {
  useToast,
  toast,
  type Toast,
} from './useToast';

// WebSocket
export {
  useWebSocket,
  useCallSubscription,
  useConnectionStatus,
} from './useWebSocket';
