import { EditorButton } from './buttons/editor-button';
import { HomeButton } from './buttons/home-button';
import { ProfileButton } from './buttons/profile-button';

export const MainNav = () => {
  return (
    <div className='sticky bottom-0 left-0 grid h-[30px] w-full shrink-0 grid-cols-3 border-t bg-background'>
      <HomeButton />
      <EditorButton />
      <ProfileButton />
    </div>
  );
};
