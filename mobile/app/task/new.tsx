import { useRef } from "react";
import { useRouter } from "expo-router";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader } from "../../src/components/ScreenHeader";
import { TaskForm } from "../../src/components/TaskForm";
import { deletePhoto, savePhoto } from "../../src/services/photoStorage";
import type { Task } from "../../src/types/Task";
import { useTasks } from "../../src/hooks/useTasks";
import { colors } from "../../src/theme";

export default function NewTaskScreen() {
  const {
    addTask,
    updateTask,
    uploadTaskPhoto,
    deleteTaskPhoto,
    isAddingTask,
    isUploadingTaskPhoto,
  } = useTasks();
  const router = useRouter();
  const createdTask = useRef<Task | null>(null);

  async function save(values: Parameters<typeof addTask>[0], photoUri?: string) {
    const retrying = createdTask.current !== null;
    const task = createdTask.current ?? (await addTask(values));
    createdTask.current = task;
    if (retrying) await updateTask(task.id, values);
    if (photoUri) {
      try {
        const localPhoto = await savePhoto(task.id, photoUri);
        await uploadTaskPhoto(task.id, localPhoto);
      } catch (error) {
        const reason = error instanceof Error ? ` (${error.message})` : "";
        throw new Error(
          `La tarea ya se creó, pero no se pudo adjuntar la foto${reason}. Pulsa Guardar para reintentar.`,
        );
      }
    } else if (retrying) {
      await deleteTaskPhoto(task.id);
      await deletePhoto(task.id);
    }
    createdTask.current = null;
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title="Nueva tarea" />
      <TaskForm
        isSaving={isAddingTask || isUploadingTaskPhoto}
        onSave={save}
        onSuccess={() => router.back()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.paper,
  },
});
