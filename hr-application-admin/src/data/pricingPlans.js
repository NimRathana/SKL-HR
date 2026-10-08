const planPresentation = {
  free: { action: "Choose Free" },
  basic: { action: "Choose Basic" },
  medium: { action: "Choose Medium", popular: true },
}

const defaultPlanOrder = ["free", "basic", "medium"]

const formatFeatureName = (name) => name
  .replaceAll("_", " ")
  .replace(/\b\w/g, (letter) => letter.toUpperCase())

export function toPricingPlans(records = [], planTypes = []) {
  const plansByType = new Map()
  const planTypeOrder = new Map(
    planTypes.map((planType, index) => [
      planType.code,
      planType.sort_order ?? index,
    ]),
  )

  for (const record of records) {
    if (!record.is_active) continue
    const plan = plansByType.get(record.plan_type) || { type: record.plan_type }
    plan[record.billing_interval] = record
    plansByType.set(record.plan_type, plan)
  }

  const types = [...plansByType.keys()].sort((left, right) => {
    const leftOrder = planTypeOrder.get(left)
    const rightOrder = planTypeOrder.get(right)
    const fallbackLeftOrder = defaultPlanOrder.indexOf(left)
    const fallbackRightOrder = defaultPlanOrder.indexOf(right)
    const resolvedLeftOrder = leftOrder ?? (fallbackLeftOrder < 0 ? Number.MAX_SAFE_INTEGER : fallbackLeftOrder)
    const resolvedRightOrder = rightOrder ?? (fallbackRightOrder < 0 ? Number.MAX_SAFE_INTEGER : fallbackRightOrder)
    return resolvedLeftOrder - resolvedRightOrder || left.localeCompare(right)
  })

  return types.flatMap(type => {
    const recordsByInterval = plansByType.get(type)
    if (!recordsByInterval) return []

    const monthly = recordsByInterval.monthly
    const yearly = recordsByInterval.yearly
    const monthlySource = monthly || yearly
    const yearlySource = yearly || monthly
    const source = monthlySource
    const label = source.name.replace(/\s+(monthly|yearly)$/i, "")
    const presentation = planPresentation[type] || { action: `Choose ${label}` }
    const getIntervalDetails = (record) => {
      const featureFlags = record.features || {}
      const includedFeatures = Object.entries(featureFlags)
        .filter(([, enabled]) => enabled)
        .map(([name]) => formatFeatureName(name))
      const employeeLimit = record.max_employees == null
        ? "Unlimited employees"
        : `Up to ${record.max_employees} employees`
      const companyLimit = record.max_companies == null
        ? "Unlimited companies"
        : `Up to ${record.max_companies} companies`
      const hrUserLimit = record.max_hr_users == null
        ? "Unlimited HR users"
        : `Up to ${record.max_hr_users} HR users`

      return {
        features: [employeeLimit, companyLimit, hrUserLimit, ...includedFeatures],
        featureFlags,
        maxEmployees: record.max_employees,
        maxCompanies: record.max_companies,
        maxHrUsers: record.max_hr_users,
      }
    }
    const monthlyDetails = getIntervalDetails(monthlySource)
    const yearlyDetails = getIntervalDetails(yearlySource)

    return [{
      id: type,
      name: label,
      type,
      text: monthly?.description || yearly?.description || "",
      monthlyText: monthly?.description || yearly?.description || "",
      yearlyText: yearly?.description || monthly?.description || "",
      features: monthlyDetails.features,
      monthlyFeatures: monthlyDetails.features,
      yearlyFeatures: yearlyDetails.features,
      featureFlags: monthlyDetails.featureFlags,
      monthlyFeatureFlags: monthlyDetails.featureFlags,
      yearlyFeatureFlags: yearlyDetails.featureFlags,
      maxEmployees: monthlyDetails.maxEmployees,
      maxCompanies: monthlyDetails.maxCompanies,
      maxHrUsers: monthlyDetails.maxHrUsers,
      action: presentation.action,
      popular: presentation.popular || false,
      currency: source.currency,
      monthlyCurrency: monthlySource.currency,
      yearlyCurrency: yearlySource.currency,
      monthlyPlanId: monthly?.id || null,
      monthlyPrice: monthly ? Number(monthly.price) : null,
      yearlyPlanId: yearly?.id || null,
      yearlyPrice: yearly ? Number(yearly.price) : null,
    }]
  })
}

export function buildCompareRows(plans = [], yearly = false) {
  const featureKey = yearly ? "yearlyFeatureFlags" : "monthlyFeatureFlags"
  const featureNames = [...new Set(plans.flatMap((plan) => Object.keys(plan[featureKey] || plan.featureFlags || {})))]
  return featureNames.map((feature) => [
    formatFeatureName(feature),
    plans.map((plan) => Boolean((plan[featureKey] || plan.featureFlags)?.[feature])),
  ])
}
