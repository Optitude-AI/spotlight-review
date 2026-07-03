/**
 * Sample headshots for the instant "Try samples" experience.
 * Sourced via the image-search skill (OSS-hosted, embeddable URLs).
 * Used so a user can evaluate the tool without uploading their own images.
 */
export interface SamplePortrait {
  id: string;
  name: string;
  url: string;
}

export const SAMPLE_PORTRAITS: SamplePortrait[] = [
  {
    id: "sample-1",
    name: "Diverse smiling portraits",
    url: "https://sfile.chatglm.cn/images-ppt/8004827081ed.png",
  },
  {
    id: "sample-2",
    name: "Stylised portrait",
    url: "https://sfile.chatglm.cn/images-ppt/62ce8c62c497.jpg",
  },
  {
    id: "sample-3",
    name: "High-contrast B&W portrait",
    url: "https://sfile.chatglm.cn/images-ppt/66e5b6eebb45.jpg",
  },
  {
    id: "sample-4",
    name: "Professional studio portrait",
    url: "https://sfile.chatglm.cn/images-ppt/904de3520ec3.jpg",
  },
  {
    id: "sample-5",
    name: "Blue backdrop portrait",
    url: "https://sfile.chatglm.cn/images-ppt/0e333c9d5ab6.jpg",
  },
  {
    id: "sample-6",
    name: "Bearded portrait, glasses",
    url: "https://sfile.chatglm.cn/images-ppt/8a429c117d73.jpg",
  },
];
