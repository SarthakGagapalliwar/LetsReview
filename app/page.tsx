import { Button } from "@/components/ui/button";
import Logout from "@/module/auth/components/logout";
import { requiredAuth } from "@/module/auth/utils/auth-utils";


export default async function Home() {
    await requiredAuth()
  return (
    <Logout>
      <Button>
        Logout
      </Button>
    </Logout>
  );
}
