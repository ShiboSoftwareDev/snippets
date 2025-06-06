import { useEffect, useState } from "react"
import { useParams } from "wouter"
import { usePackageById } from "./use-package-by-package-id"
import { usePackageByName } from "./use-package-by-package-name"
import { useUrlParams } from "./use-url-params"

export const useCurrentPackageId = (): {
  packageId: string | null
  isLoading: boolean
  error: (Error & { status: number }) | null
} => {
  const urlParams = useUrlParams()
  const urlPackageId = urlParams.package_id
  const wouter = useParams()
  const [packageIdFromUrl, setPackageId] = useState<string | null>(urlPackageId)

  useEffect(() => {
    if (urlPackageId) {
      setPackageId(urlPackageId)
    }
  }, [urlPackageId])

  const packageName =
    wouter.author && wouter.packageName
      ? `${wouter.author}/${wouter.packageName}`
      : null

  const {
    data: packageByName,
    isLoading: isLoadingPackageByName,
    error: errorPackageByName,
  } = usePackageByName(packageName)

  const packageId = packageIdFromUrl ?? packageByName?.package_id ?? null

  return {
    packageId,
    isLoading: isLoadingPackageByName,
    error: errorPackageByName,
  }
}
