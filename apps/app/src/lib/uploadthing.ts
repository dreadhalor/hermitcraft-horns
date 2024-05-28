// literally so wack but Typescript says v5.5 will fix this
import type {} from '@uploadthing/shared';

import { generateReactHelpers } from '@uploadthing/react';
import type { OurFileRouter } from '@/app/api/uploadthing/core';

const what = generateReactHelpers<OurFileRouter>();

export const { useUploadThing } = what;
export const { uploadFiles } = what;
