import { useRouter } from "next/router"

export const useYllapito = () => {
    const router = useRouter()
    const isYllapito = router.asPath.startsWith("/yllapito");
    return isYllapito
}