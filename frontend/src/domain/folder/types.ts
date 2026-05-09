export interface ImageFile {
  id: number;
  orgName: string;
  imageFormat: string;
  imageWidth: number;
  imageHeight: number;
  captureDateTime: string;
  fileSize: number;
  note?: string;
}

export interface ImageViewFile {
  id: number;
  orgName: string;
  imageFormat: string;
  imageWidth: number;
  imageHeight: number;
  folder: {
    id: number;
    folderName: string;
  };
  captureDateTime?: string;
  cameraManufacturer?: string;
  cameraModel?: string;
  shutterSpeed?: number;
  apertureValue?: number;
  isoSpeed?: number;
  focalLength?: number;
}
