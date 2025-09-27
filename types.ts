export interface Scene {
  scene_description: string;
  camera_angle: string;
}

export interface StoryElements {
  character: string;
  setting: string;
  scenes: Scene[];
}
