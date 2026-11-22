import { render, screen } from "@testing-library/react-native";
import { TaskPhoto } from "./TaskPhoto";

jest.mock("../services/photoStorage", () => ({ getPhotoUri: jest.fn() }));
jest.mock("../services/authStorage", () => ({ getAuthToken: jest.fn() }));
jest.mock("../services/api", () => ({
  getTaskPhotoUrl: jest.fn(() => "http://localhost:3000/tasks/1/photo"),
}));

import { getPhotoUri } from "../services/photoStorage";
import { getAuthToken } from "../services/authStorage";

const style = { width: 10, height: 10 };

beforeEach(() => jest.clearAllMocks());

test("muestra la foto local si existe", async () => {
  jest.mocked(getPhotoUri).mockResolvedValue("file:///documents/1.jpg");
  jest.mocked(getAuthToken).mockResolvedValue("token");

  await render(
    <TaskPhoto taskId="1" accessibilityLabel="Foto" style={style} />,
  );

  const img = await screen.findByLabelText("Foto");
  expect(img.props.source.uri).toBe("file:///documents/1.jpg");
  expect(img.props.source.headers).toBeUndefined();
});

test("si no hay local, pide la foto remota con token", async () => {
  jest.mocked(getPhotoUri).mockResolvedValue(null);
  jest.mocked(getAuthToken).mockResolvedValue("token");

  await render(
    <TaskPhoto taskId="1" accessibilityLabel="Foto" style={style} />,
  );

  const img = await screen.findByLabelText("Foto");
  expect(img.props.source.uri).toBe("http://localhost:3000/tasks/1/photo");
  expect(img.props.source.headers).toEqual({ Authorization: "Bearer token" });
});
