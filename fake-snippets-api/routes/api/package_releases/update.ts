import { withRouteSpec } from "fake-snippets-api/lib/middleware/with-winter-spec"
import { z } from "zod"

export default withRouteSpec({
  methods: ["POST"],
  auth: "none",
  jsonBody: z.object({
    package_release_id: z.string().optional(),
    package_name_with_version: z.string().optional(),
    is_locked: z.boolean().optional(),
    is_latest: z.boolean().optional(),
    license: z.string().optional(),
    fs_sha: z.string().optional(),
    ready_to_build: z.boolean().optional(),
    ai_review_requested: z.boolean().optional(),
  }),
  jsonResponse: z.object({
    ok: z.boolean(),
  }),
})(async (req, ctx) => {
  const {
    package_release_id,
    package_name_with_version,
    is_locked,
    is_latest,
    license,
    fs_sha,
    ready_to_build,
    ai_review_requested,
  } = req.jsonBody
  let releaseId = package_release_id

  // Handle package_name_with_version lookup
  if (!releaseId && package_name_with_version) {
    const [packageName, version] = package_name_with_version.split("@")
    const pkg = ctx.db.packages.find((p) => p.name === packageName)
    if (pkg) {
      const release = ctx.db.packageReleases.find(
        (pr) => pr.package_id === pkg.package_id && pr.version === version,
      )
      if (release) {
        releaseId = release.package_release_id
      }
    }
  }

  if (!releaseId) {
    return ctx.error(404, {
      error_code: "package_release_not_found",
      message: "Package release not found",
    })
  }

  const delta = {
    is_locked,
    is_latest,
    license,
    fs_sha,
    ready_to_build,
    ai_review_requested,
  }
  if (
    Object.keys(delta).filter(
      (k) => delta[k as keyof typeof delta] !== undefined,
    ).length === 0
  ) {
    return ctx.error(400, {
      error_code: "no_fields_provided",
      message: "No fields provided to update",
    })
  }

  const release = ctx.db.packageReleases.find(
    (pr) => pr.package_release_id === releaseId,
  )
  if (!release) {
    return ctx.error(404, {
      error_code: "package_release_not_found",
      message: "Package release not found",
    })
  }

  // Create updated release object
  const updatedRelease = {
    ...release,
    ...(is_locked !== undefined && { is_locked }),
    ...(is_latest !== undefined && { is_latest }),
    ...(license !== undefined && { license }),
    ...(fs_sha !== undefined && { fs_sha }),
    ...(ready_to_build !== undefined && { ready_to_build }),
    ...(ai_review_requested !== undefined && { ai_review_requested }),
    ...(ai_review_requested === true && {
      ai_review_text: "Placeholder AI Review Text",
    }),
  }

  // Handle is_latest updates atomically
  if (is_latest !== undefined && is_latest) {
    // Get all releases for this package that are currently marked as latest
    const otherLatestReleases = ctx.db.packageReleases.filter(
      (pr) =>
        pr.package_id === release.package_id &&
        pr.package_release_id !== releaseId &&
        pr.is_latest,
    )

    // Update all releases in a single operation
    for (const latestRelease of otherLatestReleases) {
      ctx.db.updatePackageRelease({
        ...latestRelease,
        is_latest: false,
      })
    }
  }

  // Update the target release
  ctx.db.updatePackageRelease(updatedRelease)

  return ctx.json({
    ok: true,
  })
})
