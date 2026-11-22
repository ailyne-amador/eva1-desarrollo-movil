import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as taskRepository from "../db/taskRepository";
import { useAuth } from "../context/AuthContext";
import { requestSync } from "../services/sync";
import { generateUuid } from "../services/uuid";
import { deletePhoto, savePhoto } from "../services/photoStorage";
import type { TaskFormValues } from "../schemas/taskSchema";
import type { Task } from "../types/Task";

const tasksQueryKey = ["tasks"] as const;

function useUserId(): string | null {
  const { user } = useAuth();
  return user ? String(user.id) : null;
}

function useInvalidateTasks() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: tasksQueryKey });
}

function useDeleteTaskMutation() {
  const userId = useUserId();
  const invalidateTasks = useInvalidateTasks();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!userId) throw new Error("No hay sesión");
      await taskRepository.markDeleted(id);
      requestSync(userId);
    },
    onSuccess: invalidateTasks,
  });
}

function useUpdateTaskMutation() {
  const userId = useUserId();
  const invalidateTasks = useInvalidateTasks();
  return useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string;
      values: TaskFormValues;
    }) => {
      if (!userId) throw new Error("No hay sesión");
      const task = await taskRepository.update(id, {
        title: values.title,
        description: values.description,
        latitude: values.latitude ?? null,
        longitude: values.longitude ?? null,
        locationName: values.locationName ?? null,
      });
      if (!task) throw new Error("Tarea no encontrada");
      requestSync(userId);
      return task;
    },
    onSuccess: invalidateTasks,
  });
}

function usePhotoMutations() {
  const userId = useUserId();
  const invalidateTasks = useInvalidateTasks();

  const uploadMutation = useMutation({
    mutationFn: async ({ id, photo }: { id: string; photo: string | Blob }) => {
      if (!userId) throw new Error("No hay sesión");
      const localPhoto =
        typeof photo === "string" ? await savePhoto(id, photo) : photo;
      const photoUri = typeof localPhoto === "string" ? localPhoto : null;
      await taskRepository.setPhotoStatus(id, "pending_upload", photoUri);
      requestSync(userId);
    },
    onSuccess: invalidateTasks,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!userId) throw new Error("No hay sesión");
      await taskRepository.setPhotoStatus(id, "pending_delete", null);
      await deletePhoto(id);
      requestSync(userId);
    },
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

export interface UseTasksReturn {
  tasks: Task[];
  isLoading: boolean;
  isError: boolean;
  refetchTasks: () => Promise<unknown>;
  addTask: (values: TaskFormValues, photoUri?: string) => Promise<Task>;
  isAddingTask: boolean;
  updateTask: (id: string, values: TaskFormValues) => Promise<Task | null>;
  isUpdatingTask: boolean;
  deleteTask: (id: string) => Promise<void>;
  isDeletingTask: boolean;
  uploadTaskPhoto: (id: string, photo: string | Blob) => Promise<void>;
  deleteTaskPhoto: (id: string) => Promise<void>;
  isUploadingTaskPhoto: boolean;
  isDeletingTaskPhoto: boolean;
}

export function useTasks(): UseTasksReturn {
  const queryClient = useQueryClient();
  const userId = useUserId();

  const tasksQuery = useQuery({
    queryKey: tasksQueryKey,
    queryFn: async () => {
      if (!userId) return [];
      return taskRepository.list(userId);
    },
    enabled: userId !== null,
  });

  const addMutation = useMutation({
    mutationFn: async ({
      values,
      photoUri,
    }: {
      values: TaskFormValues;
      photoUri?: string;
    }) => {
      if (!userId) throw new Error("No hay sesión");
      let localPhotoUri: string | null = null;
      const id = generateUuid();
      if (photoUri) {
        const saved = await savePhoto(id, photoUri);
        localPhotoUri = typeof saved === "string" ? saved : null;
      }
      const task = await taskRepository.create(
        {
          id,
          title: values.title,
          description: values.description,
          latitude: values.latitude ?? null,
          longitude: values.longitude ?? null,
          locationName: values.locationName ?? null,
          photoUri: localPhotoUri,
          photoStatus: localPhotoUri ? "pending_upload" : "none",
        },
        userId,
      );
      requestSync(userId);
      return task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksQueryKey });
    },
  });

  const updateMutation = useUpdateTaskMutation();
  const deleteMutation = useDeleteTaskMutation();
  const photoMutations = usePhotoMutations();

  return {
    tasks: tasksQuery.data ?? [],
    isLoading: tasksQuery.isPending,
    isError: tasksQuery.isError,
    refetchTasks: async () => {
      const result = await tasksQuery.refetch();
      if (userId) requestSync(userId);
      return result;
    },
    addTask: (values: TaskFormValues, photoUri?: string) =>
      addMutation.mutateAsync({ values, photoUri }),
    isAddingTask: addMutation.isPending,
    updateTask: (id: string, values: TaskFormValues) =>
      updateMutation.mutateAsync({ id, values }),
    isUpdatingTask: updateMutation.isPending,
    deleteTask: deleteMutation.mutateAsync,
    isDeletingTask: deleteMutation.isPending,
    ...photoMutations,
  };
}

export interface UseTaskReturn {
  task: Task | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetchTask: () => Promise<unknown>;
  updateTask: (values: TaskFormValues) => Promise<Task | null>;
  isUpdatingTask: boolean;
  deleteTask: () => Promise<void>;
  isDeletingTask: boolean;
  uploadTaskPhoto: (photo: string | Blob) => Promise<void>;
  deleteTaskPhoto: () => Promise<void>;
  isUploadingTaskPhoto: boolean;
  isDeletingTaskPhoto: boolean;
}

export function useTask(id: string): UseTaskReturn {
  const userId = useUserId();

  const taskQuery = useQuery({
    queryKey: [...tasksQueryKey, id],
    queryFn: async () => {
      if (!userId) return null;
      const task = await taskRepository.get(id);
      if (!task) throw new Error("Tarea no encontrada");
      return task;
    },
    enabled: id.length > 0 && userId !== null,
  });

  const deleteMutation = useDeleteTaskMutation();
  const updateMutation = useUpdateTaskMutation();
  const photoMutations = usePhotoMutations();

  return {
    task: taskQuery.data ?? undefined,
    isLoading: taskQuery.isPending,
    isError: taskQuery.isError,
    error: taskQuery.error,
    refetchTask: async () => {
      const result = await taskQuery.refetch();
      if (userId) requestSync(userId);
      return result;
    },
    updateTask: (values: TaskFormValues) =>
      updateMutation.mutateAsync({ id, values }),
    isUpdatingTask: updateMutation.isPending,
    deleteTask: () => deleteMutation.mutateAsync(id),
    isDeletingTask: deleteMutation.isPending,
    uploadTaskPhoto: (photo: string | Blob) =>
      photoMutations.uploadTaskPhoto(id, photo),
    deleteTaskPhoto: () => photoMutations.deleteTaskPhoto(id),
    isUploadingTaskPhoto: photoMutations.isUploadingTaskPhoto,
    isDeletingTaskPhoto: photoMutations.isDeletingTaskPhoto,
  };
}
