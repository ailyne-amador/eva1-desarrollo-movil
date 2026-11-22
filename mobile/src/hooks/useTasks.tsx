import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createTask as createTaskRequest,
  deleteTask as deleteTaskRequest,
  deleteTaskPhoto as deleteTaskPhotoRequest,
  getTask,
  getTasks,
  updateTask as updateTaskRequest,
  uploadTaskPhoto as uploadTaskPhotoRequest,
} from "../services/api";
import type { TaskFormValues } from "../schemas/taskSchema";

const tasksQueryKey = ["tasks"] as const;

function useDeleteTaskMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTaskRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tasksQueryKey }),
  });
}

function useUpdateTaskMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: TaskFormValues }) =>
      updateTaskRequest(id, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tasksQueryKey }),
  });
}

function usePhotoMutations() {
  const queryClient = useQueryClient();
  const invalidateTasks = () =>
    queryClient.invalidateQueries({ queryKey: tasksQueryKey });
  const uploadMutation = useMutation({
    mutationFn: ({ id, photo }: { id: string; photo: string | Blob }) =>
      uploadTaskPhotoRequest(id, photo),
    onSuccess: invalidateTasks,
  });
  const deleteMutation = useMutation({
    mutationFn: deleteTaskPhotoRequest,
    onSuccess: invalidateTasks,
  });
  return {
    uploadTaskPhoto: (id: string, photo: string | Blob) =>
      uploadMutation.mutateAsync({ id, photo }),
    deleteTaskPhoto: deleteMutation.mutateAsync,
    isUploadingTaskPhoto: uploadMutation.isPending,
    isDeletingTaskPhoto: deleteMutation.isPending,
  };
}

export function useTasks() {
  const queryClient = useQueryClient();
  const tasksQuery = useQuery({ queryKey: tasksQueryKey, queryFn: getTasks });
  const addMutation = useMutation({
    mutationFn: createTaskRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tasksQueryKey }),
  });
  const updateMutation = useUpdateTaskMutation();
  const deleteMutation = useDeleteTaskMutation();
  const photoMutations = usePhotoMutations();
  return {
    tasks: tasksQuery.data ?? [],
    isLoading: tasksQuery.isPending,
    isError: tasksQuery.isError,
    refetchTasks: tasksQuery.refetch,
    addTask: addMutation.mutateAsync,
    ...photoMutations,
    isAddingTask: addMutation.isPending,
    updateTask: (id: string, values: TaskFormValues) =>
      updateMutation.mutateAsync({ id, values }),
    isUpdatingTask: updateMutation.isPending,
    deleteTask: deleteMutation.mutateAsync,
    isDeletingTask: deleteMutation.isPending,
  };
}

export function useTask(id: string) {
  const taskQuery = useQuery({
    queryKey: [...tasksQueryKey, id],
    queryFn: () => getTask(id),
    enabled: id.length > 0,
  });
  const deleteMutation = useDeleteTaskMutation();
  const updateMutation = useUpdateTaskMutation();
  const photoMutations = usePhotoMutations();
  return {
    task: taskQuery.data,
    isLoading: taskQuery.isPending,
    isError: taskQuery.isError,
    error: taskQuery.error,
    refetchTask: taskQuery.refetch,
    updateTask: (values: TaskFormValues) =>
      updateMutation.mutateAsync({ id, values }),
    isUpdatingTask: updateMutation.isPending,
    deleteTask: deleteMutation.mutateAsync,
    isDeletingTask: deleteMutation.isPending,
    ...photoMutations,
  };
}
