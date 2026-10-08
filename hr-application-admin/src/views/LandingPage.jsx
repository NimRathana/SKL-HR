"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "@components/Link";
import { getApi, getAuthToken } from "@core/api";
import { buildCompareRows, toPricingPlans } from "@data/pricingPlans";
import {
  Alert,
  Accordion,
  AccordionDetails,
  AccordionSummary,
  AppBar,
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  Container,
  CircularProgress,
  Divider,
  Grid,
  Stack,
  Switch,
  Toolbar,
  Typography,
} from "@mui/material";
import {
  AccessTimeOutlined,
  AccountBalanceWalletOutlined,
  ArrowForward,
  AssessmentOutlined,
  BusinessCenterOutlined,
  CheckCircle,
  DashboardOutlined,
  ExpandMore,
  GroupsOutlined,
  LoginOutlined,
  PriceCheckOutlined,
  RocketLaunchOutlined,
  TrendingUpOutlined,
  VerifiedUserOutlined,
} from "@mui/icons-material";

const featureCards = [
  [
    <GroupsOutlined />,
    "Employee Management",
    "Manage employee profiles, documents, departments, positions, and contracts.",
  ],
  [
    <AccessTimeOutlined />,
    "Attendance Tracking",
    "Track check-in, check-out, working hours, late arrivals, and absences.",
  ],
  [
    <BusinessCenterOutlined />,
    "Leave Management",
    "Employees request leave while managers review and approve it quickly.",
  ],
  [
    <AccountBalanceWalletOutlined />,
    "Payroll Management",
    "Manage salaries, deductions, bonuses, payslips, and payroll records.",
  ],
  [
    <TrendingUpOutlined />,
    "Performance Management",
    "Set goals, conduct reviews, and follow employee performance over time.",
  ],
  [
    <AssessmentOutlined />,
    "HR Reports",
    "Generate useful reports and gain insight into your workforce.",
  ],
];

const navSx = {
  textTransform: "none",
  fontWeight: 700,
  color: "text.secondary",
};

const reveal = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

const stagger = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1 },
  },
};

function DashboardPreview({ portal = false }) {
  const cards = portal
    ? [
        ["18", "Leave days available"],
        ["09:01", "Checked in today"],
        ["4", "Goals in progress"],
      ]
    : [
        ["248", "Total employees"],
        ["94.8%", "Today's attendance"],
        ["12", "Pending leave requests"],
      ];

  return (
    <Card
      sx={{
        overflow: "hidden",
        borderRadius: "var(--mui-shape-borderRadius)",
      }}
    >
      <Box
        sx={{
          height: 46,
          display: "flex",
          alignItems: "center",
          px: 2,
          borderBottom: "1px solid",
          borderColor: "divider",
          gap: 0.75,
        }}
      >
        <Box
          sx={{
            width: 9,
            height: 9,
            borderRadius: "50%",
            backgroundColor: "error.main",
          }}
        />
        <Box
          sx={{
            width: 9,
            height: 9,
            borderRadius: "50%",
            backgroundColor: "warning.main",
          }}
        />
        <Box
          sx={{
            width: 9,
            height: 9,
            borderRadius: "50%",
            backgroundColor: "success.main",
          }}
        />
        <Box
          sx={{
            ml: 1.5,
            height: 22,
            width: 180,
            borderRadius: "var(--mui-shape-borderRadius)",
            backgroundColor: "action.hover",
          }}
        />
      </Box>

      <Stack direction="row" sx={{ minHeight: 365 }}>
        <Box
          sx={{
            display: { xs: "none", sm: "block" },
            width: 150,
            p: 2,
            borderRight: "1px solid",
            borderColor: "divider",
          }}
        >
          <Stack
            direction="row"
            spacing={0.75}
            alignItems="center"
            sx={{ mb: 3 }}
          >
            <Box
              sx={{
                display: "grid",
                placeItems: "center",
                width: 24,
                height: 24,
                backgroundColor: "primary.main",
                borderRadius: "var(--mui-shape-borderRadius)",
              }}
            >
              H
            </Box>

            <Typography fontWeight={900} fontSize={13}>
              SKL HR
            </Typography>
          </Stack>

          {[
            "Dashboard",
            portal ? "My Profile" : "Employees",
            "Attendance",
            "Leave",
            "Payroll",
            "Performance",
            "Reports",
            "Settings",
          ].map((item, index) => (
            <Box
              key={item}
              sx={{
                py: 0.8,
                px: 1,
                mb: 0.5,
                borderRadius: "var(--mui-shape-borderRadius)",
                backgroundColor: index === 0 ? "primary.lighterOpacity" : "transparent",
                color: index === 0 ? "primary.main" : "text.secondary",
                fontSize: 11,
                fontWeight: index === 0 ? 800 : 600,
              }}
            >
              {item}
            </Box>
          ))}
        </Box>

        <Box
          sx={{
            flex: 1,
            p: { xs: 2, sm: 2.5 },
            minWidth: 0,
          }}
        >
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Box>
              <Typography fontWeight={850}>
                {portal ? "Welcome back, Rathana" : "Good morning, Rathana"}
              </Typography>

              <Typography variant="caption" color="text.secondary">
                Here is what is happening today.
              </Typography>
            </Box>

            <Avatar
              sx={{
                width: 30,
                height: 30,
                backgroundColor: "primary.light",
              }}
            >
              {portal ? "S" : "O"}
            </Avatar>
          </Stack>

          <Grid container spacing={1.25} sx={{ mt: 1.75 }}>
            {cards.map(([value, label]) => (
              <Grid key={label} size={{ xs: 12, md: 4 }}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: "var(--mui-shape-borderRadius)",
                    backgroundColor: "action.hover",
                  }}
                >
                  <Typography fontWeight={900} fontSize={19}>
                    {value}
                  </Typography>

                  <Typography variant="caption" color="text.secondary">
                    {label}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>

          <Grid container spacing={1.25} sx={{ mt: 1.75 }}>
            <Grid size={{ xs: 12, md: 7 }}>
              <Box
                sx={{
                  height: 128,
                  p: 1.5,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: "var(--mui-shape-borderRadius)",
                }}
              >
                <Typography variant="caption" fontWeight={800}>
                  {portal ? "Attendance this week" : "Employee growth"}
                </Typography>

                <Stack
                  direction="row"
                  alignItems="end"
                  spacing={0.75}
                  sx={{ height: 80, pt: 1 }}
                >
                  {[38, 56, 45, 74, 60, 88, 76].map(
                    (height, index) => (
                      <Box
                        key={index}
                        sx={{
                          flex: 1,
                          height,
                          borderRadius:
                            "var(--mui-shape-borderRadius)",
                          backgroundColor:
                            index === 5
                              ? "primary.main"
                              : "primary.light",
                          opacity: index === 5 ? 1 : 0.55,
                        }}
                      />
                    ),
                  )}
                </Stack>
              </Box>
            </Grid>

            <Grid size={{ xs: 12, md: 5 }}>
              <Box
                sx={{
                  height: 128,
                  p: 1.5,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: "var(--mui-shape-borderRadius)",
                }}
              >
                <Typography variant="caption" fontWeight={800}>
                  {portal ? "Upcoming" : "Recent activity"}
                </Typography>

                {[
                  "Leave request approved",
                  "New employee added",
                  "Payroll processed",
                ]
                  .slice(0, 3)
                  .map((item) => (
                    <Stack
                      key={item}
                      direction="row"
                      spacing={0.75}
                      sx={{ mt: 1 }}
                    >
                      <CheckCircle
                        color="success"
                        sx={{ fontSize: 14 }}
                      />

                      <Typography
                        variant="caption"
                        color="text.secondary"
                      >
                        {item}
                      </Typography>
                    </Stack>
                  ))}
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Stack>
    </Card>
  );
}

export default function LandingPage() {
  const [yearly, setYearly] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [pricingPlans, setPricingPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState("");

  useEffect(() => {
    setIsAuthenticated(Boolean(getAuthToken()));
    setAuthChecked(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadPlans = async () => {
      try {
        const api = await getApi();
        const [plansResponse, typesResponse] = await Promise.all([
          api.get("/plans"),
          api.get("/plan-types"),
        ]);
        if (!cancelled) {
          setPricingPlans(toPricingPlans(plansResponse.data, typesResponse.data));
        }
      } catch (error) {
        if (!cancelled) setPlansError(error?.response?.data?.detail || "Unable to load pricing plans.");
      } finally {
        if (!cancelled) setPlansLoading(false);
      }
    };
    loadPlans();
    return () => { cancelled = true; };
  }, []);

  const planHref = (plan) => {
    const interval = yearly ? "yearly" : "monthly";
    const planId = yearly ? plan.yearlyPlanId : plan.monthlyPlanId;
    if (!planId) return "#pricing";
    const params = new URLSearchParams({ plan: plan.type, plan_id: planId, interval });
    return `${isAuthenticated ? "/checkout" : "/register"}?${params.toString()}`;
  };
  const compareRows = buildCompareRows(pricingPlans, yearly);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: "background.default",
        color: "text.primary",

        "& .MuiAppBar-root": {
          backgroundColor: "background.paper",
          borderColor: "divider",
        },

        "& main > *": {
          backgroundColor: "background.default",
          borderColor: "divider",
        },

        "& main > *:first-child": {
          background:
            "linear-gradient(150deg, var(--mui-palette-primary-lighterOpacity) 0%, var(--mui-palette-background-default) 55%, var(--mui-palette-primary-lighterOpacity) 100%)",
        },

        "& .MuiCard-root": {
          backgroundColor: "background.paper",
          borderColor: "divider",
        },

        "& .MuiTypography-root": {
          color: "text.primary",
        },

        "& .MuiTypography-overline": {
          color: "primary.main",
        },

        "& .MuiButton-contained": {
          backgroundColor: "primary.main",
        },

        "& .MuiButton-outlined": {
          color: "primary.main",
          borderColor: "primary.main",
        },

        "& .MuiChip-root": {
          backgroundColor: "primary.lighterOpacity",
          color: "primary.main",
        },

        "& .MuiAvatar-root": {
          backgroundColor: "primary.lighterOpacity",
          color: "primary.main",
        },

        "& main .MuiSvgIcon-root": {
          color: "primary.main",
        },

        "& > footer": {
          backgroundColor: "background.paper",
          color: "text.secondary",
        },
      }}
    >
      <AppBar position="sticky" color="inherit">
        <Container maxWidth="xl">
          <Toolbar
            disableGutters
            sx={{
              minHeight: 76,
              justifyContent: "space-between",
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <Box
                sx={{
                  display: "grid",
                  placeItems: "center",
                  width: 34,
                  height: 34,
                  borderRadius: "var(--mui-shape-borderRadius)",
                  backgroundColor: "primary.main",
                  fontWeight: 900,
                }}
              >
                H
              </Box>

              <Typography
                variant="h6"
                fontWeight={900}
                letterSpacing="-.05em"
              >
                SKL HR
              </Typography>
            </Stack>

            <Stack
              direction="row"
              spacing={0.5}
              sx={{
                display: { xs: "none", md: "flex" },
              }}
            >
              <Button href="#features" sx={navSx}>
                Features
              </Button>

              <Button href="#solutions" sx={navSx}>
                Solutions
              </Button>

              <Button href="#pricing" sx={navSx}>
                Pricing
              </Button>

              <Button href="#resources" sx={navSx}>
                Resources
              </Button>
            </Stack>

            {authChecked && (
              <Stack direction="row" spacing={1}>
                {isAuthenticated ? (
                  <Button
                    component={Link}
                    href="/dashboard"
                    variant="contained"
                    startIcon={<DashboardOutlined />}
                    disableElevation
                    sx={{
                      textTransform: "none",
                      fontWeight: 800,
                    }}
                  >
                    Dashboard
                  </Button>
                ) : (
                  <>
                    <Button
                      component={Link}
                      href="/login"
                      startIcon={<LoginOutlined />}
                      sx={{ fontWeight: 700 }}
                    >
                      Login
                    </Button>

                    <Button
                      component={Link}
                      href="/register"
                      variant="contained"
                      startIcon={<RocketLaunchOutlined />}
                      disableElevation
                    >
                      Get Started
                    </Button>
                  </>
                )}
              </Stack>
            )}
          </Toolbar>
        </Container>
      </AppBar>

      <Box component="main">
        <Box
          sx={{
            position: "relative",
            overflow: "hidden",
            pt: { xs: 9, md: 15 },
            pb: { xs: 10, md: 15 },
          }}
        >
          <Box
            sx={{
              position: "absolute",
              width: 520,
              height: 520,
              borderRadius: "50%",
              top: -280,
              right: -110,
              opacity: 0.28,
            }}
          />

          <Container
            maxWidth="xl"
            sx={{ position: "relative" }}
          >
            <Grid
              container
              spacing={{ xs: 6, md: 8 }}
              alignItems="center"
            >
              <Grid
                size={{ xs: 12, md: 6 }}
                component={motion.div}
                variants={stagger}
                initial="hidden"
                animate="visible"
              >
                <motion.div variants={reveal}>
                <Chip
                  label="ALL-IN-ONE HR MANAGEMENT"
                  size="small"
                  sx={{
                    fontWeight: 900,
                    letterSpacing: 0.7,
                  }}
                />

                <Typography
                  component="h1"
                  sx={{
                    mt: 2.5,
                    fontWeight: 900,
                    fontSize: {
                      xs: "3rem",
                      sm: "4.1rem",
                      lg: "4.7rem",
                    },
                    lineHeight: 1.03,
                    letterSpacing: "-.065em",
                  }}
                >
                  Simplify HR.
                  <br />

                  <Box
                    component="span"
                    sx={{ color: "primary.main" }}
                  >
                    Empower your people.
                  </Box>
                </Typography>

                <Typography
                  sx={{
                    mt: 3,
                    maxWidth: 570,
                    fontSize: {
                      xs: "1.05rem",
                      md: "1.18rem",
                    },
                    lineHeight: 1.75,
                  }}
                >
                  Manage employees, attendance, leave, payroll,
                  performance, and reports from one powerful HR
                  platform.
                </Typography>

                <Stack
                  direction={{
                    xs: "column",
                    sm: "row",
                  }}
                  spacing={1.5}
                  sx={{ mt: 4 }}
                >
                  {authChecked && !isAuthenticated && (
                    <Button
                      component={Link}
                      href="/register"
                      variant="contained"
                      size="large"
                      startIcon={<RocketLaunchOutlined sx={{ color: "inherit !important" }} />}
                      disableElevation
                      sx={{
                        textTransform: "none",
                        fontWeight: 800,
                        backgroundColor: "primary.main",
                      }}
                    >
                      Get Started
                    </Button>
                  )}

                  <Button
                    href="#pricing"
                    variant="outlined"
                    size="large"
                    startIcon={<PriceCheckOutlined />}
                    sx={{
                      textTransform: "none",
                      fontWeight: 800,
                    }}
                  >
                    View Pricing
                  </Button>
                </Stack>

                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{ mt: 3 }}
                >
                  <VerifiedUserOutlined
                    sx={{
                      color: "success.main",
                      fontSize: 19,
                    }}
                  />

                  <Typography
                    variant="body2"
                    color="text.secondary"
                  >
                    Trusted by modern teams to simplify everyday HR
                    operations.
                  </Typography>
                </Stack>
                </motion.div>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <motion.div
                  initial={{ opacity: 0, x: 36 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: 0.8,
                    delay: 0.2,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  whileHover={{ y: -6 }}
                >
                  <DashboardPreview />
                </motion.div>
              </Grid>
            </Grid>
          </Container>
        </Box>

        <Container
          id="features"
          maxWidth="xl"
          sx={{
            py: { xs: 9, md: 13 },
            scrollMarginTop: 92,
          }}
        >
          <Box
            sx={{
              maxWidth: 620,
              mx: "auto",
              textAlign: "center",
              mb: 6,
            }}
          >
            <Typography
              color="primary.main"
              fontWeight={900}
              letterSpacing={1.4}
              variant="overline"
            >
              ONE PLATFORM. EVERY HR MOMENT.
            </Typography>

            <Typography
              variant="h3"
              fontWeight={900}
              letterSpacing="-.05em"
            >
              Everything your HR team needs
            </Typography>

            <Typography color="text.secondary" sx={{ mt: 1.5 }}>
              One platform to manage your entire employee lifecycle.
            </Typography>
          </Box>

          <Grid container spacing={2.5}>
            {featureCards.map(([icon, title, text]) => (
              <Grid
                key={title}
                size={{ xs: 12, sm: 6, lg: 4 }}
              >
                <motion.div
                  variants={reveal}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.2 }}
                  whileHover={{ y: -5 }}
                >
                  <Card
                    sx={{
                      p: 3.25,
                      height: "100%",
                    }}
                  >
                    <Box
                      sx={{
                        display: "grid",
                        placeItems: "center",
                        width: 46,
                        height: 46,
                        mb: 2.25,
                        borderRadius: 2,
                        color: "primary.main",
                        backgroundColor: "primary.lightOpacity",
                      }}
                    >
                      {icon}
                    </Box>

                    <Typography variant="h6" fontWeight={850}>
                      {title}
                    </Typography>

                    <Typography
                      color="text.secondary"
                      sx={{
                        mt: 1,
                        lineHeight: 1.7,
                      }}
                    >
                      {text}
                    </Typography>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Container>

        <Box
          id="solutions"
          sx={{
            py: { xs: 9, md: 13 },
            scrollMarginTop: 92,
          }}
        >
          <Container maxWidth="xl">
            <Box
              sx={{
                maxWidth: 620,
                mx: "auto",
                textAlign: "center",
                mb: 6,
              }}
            >
              <Typography
                color="primary.main"
                fontWeight={900}
                letterSpacing={1.4}
                variant="overline"
              >
                ONE CLEAR VIEW
              </Typography>

              <Typography
                variant="h3"
                fontWeight={900}
                letterSpacing="-.05em"
              >
                Your entire HR operation, in one dashboard
              </Typography>
            </Box>

            <DashboardPreview />
          </Container>
        </Box>

        <Container
          maxWidth="xl"
          sx={{ py: { xs: 9, md: 13 } }}
        >
          <Grid
            container
            spacing={6}
            alignItems="center"
          >
            <Grid size={{ xs: 12, md: 5 }}>
              <Typography
                color="primary.main"
                fontWeight={900}
                letterSpacing={1.4}
                variant="overline"
              >
                HR MANAGEMENT MADE SIMPLE
              </Typography>

              <Typography
                variant="h3"
                fontWeight={900}
                letterSpacing="-.05em"
                sx={{ mt: 1 }}
              >
                From setup to a better workday.
              </Typography>

              <Typography
                color="text.secondary"
                sx={{
                  mt: 2,
                  lineHeight: 1.75,
                }}
              >
                Give your team a clear path from scattered HR tasks
                to an organized employee experience.
              </Typography>
            </Grid>

            <Grid size={{ xs: 12, md: 7 }}>
              <Stack spacing={2}>
                {[
                  [
                    "01",
                    "Add Your Team",
                    "Create employee profiles and organize your workforce.",
                  ],
                  [
                    "02",
                    "Configure Your HR",
                    "Set working hours, leave policies, payroll settings, and permissions.",
                  ],
                  [
                    "03",
                    "Manage Everything",
                    "Track attendance, approve leave, manage payroll, and generate reports.",
                  ],
                ].map(([number, title, text]) => (
                  <Card
                    key={number}
                    sx={{
                      p: 2.5,
                      borderRadius:
                        "var(--mui-shape-borderRadius)",
                      display: "flex",
                      gap: 2.5,
                    }}
                  >
                    <Typography
                      color="primary.main"
                      fontWeight={900}
                      fontSize={18}
                    >
                      {number}
                    </Typography>

                    <Box>
                      <Typography fontWeight={850}>
                        {title}
                      </Typography>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 0.4 }}
                      >
                        {text}
                      </Typography>
                    </Box>
                  </Card>
                ))}
              </Stack>
            </Grid>
          </Grid>
        </Container>

        <Box sx={{ py: { xs: 9, md: 13 } }}>
          <Container maxWidth="xl">
            <Grid
              container
              spacing={6}
              alignItems="center"
            >
              <Grid size={{ xs: 12, md: 6 }}>
                <DashboardPreview portal />
              </Grid>

              <Grid
                size={{ xs: 12, md: 5 }}
                offset={{ md: 1 }}
              >
                <Typography
                  color="primary.main"
                  fontWeight={900}
                  letterSpacing={1.4}
                  variant="overline"
                >
                  EMPLOYEE SELF-SERVICE
                </Typography>

                <Typography
                  variant="h3"
                  fontWeight={900}
                  letterSpacing="-.05em"
                  sx={{ mt: 1 }}
                >
                  Give employees more control
                </Typography>

                <Typography
                  color="text.secondary"
                  sx={{
                    mt: 2,
                    lineHeight: 1.75,
                  }}
                >
                  Let employees handle everyday HR tasks themselves
                  while your HR team focuses on what matters most.
                </Typography>

                <Stack spacing={1.2} sx={{ mt: 3 }}>
                  {[
                    "My Profile",
                    "Attendance",
                    "Leave Balance & Requests",
                    "Payslips",
                    "Performance Goals",
                  ].map((item) => (
                    <Stack
                      direction="row"
                      key={item}
                      spacing={1}
                    >
                      <CheckCircle
                        sx={{ color: "primary.main" }}
                      />

                      <Typography fontWeight={650}>
                        {item}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </Grid>
            </Grid>
          </Container>
        </Box>

        <Box
          id="pricing"
          sx={{
            position: "relative",
            overflow: "hidden",
            py: { xs: 9, md: 13 },
            scrollMarginTop: 92,
          }}
        >
          <Box
            aria-hidden="true"
            sx={{
              position: "absolute",
              width: { xs: 260, md: 420 },
              height: { xs: 260, md: 420 },
              top: -180,
              right: { xs: -150, md: -100 },
              pointerEvents: "none",
            }}
          />

          <Container maxWidth="xl">
            <Box
              sx={{
                maxWidth: 650,
                mx: "auto",
                textAlign: "center",
                mb: 5,
              }}
            >
              <Typography
                color="primary.main"
                fontWeight={900}
                letterSpacing={1.4}
                variant="overline"
              >
                PRICING PLANS
              </Typography>

              <Typography
                variant="h3"
                fontWeight={900}
                letterSpacing="-.05em"
                sx={{ mt: 0.5 }}
              >
                Choose the Right HR Plan for Your Business
              </Typography>

              <Typography
                color="text.secondary"
                sx={{ mt: 1.5, lineHeight: 1.7 }}
              >
                Choose a plan based on your employee size and HR
                needs. Start simple and scale with confidence.
              </Typography>

              <Stack
                direction="row"
                justifyContent="center"
                alignItems="center"
                spacing={1}
                sx={{
                  mt: 3,
                  mx: "auto",
                  width: "fit-content",
                  px: 2,
                  py: 1,
                  borderRadius: 3,
                  backgroundColor: "background.paper",
                  border: "1px solid",
                  borderColor: "divider",
                  boxShadow: "var(--mui-customShadows-xs)",
                }}
              >
                <Typography fontWeight={!yearly ? 800 : 500}>
                  Monthly
                </Typography>

                <Switch
                  checked={yearly}
                  onChange={(_, checked) => setYearly(checked)}
                  color="primary"
                />

                <Typography fontWeight={yearly ? 800 : 500}>
                  Yearly
                </Typography>

                <Chip
                  label={yearly ? "Annual billing" : "Monthly billing"}
                  size="small"
                  sx={{
                    ml: 1,
                    fontWeight: 800,
                  }}
                />
              </Stack>
            </Box>

            {plansLoading && <CircularProgress sx={{ display: "block", mx: "auto", my: 4 }} />}
            {plansError && <Alert severity="error" sx={{ mt: 3 }}>{plansError}</Alert>}
            {!plansLoading && !plansError && pricingPlans.length === 0 && (
              <Typography color="text.secondary" align="center" sx={{ mt: 4 }}>
                No pricing plans are currently available.
              </Typography>
            )}

            <Grid
              container
              spacing={3}
              alignItems="stretch"
              justifyContent="center"
            >
              {pricingPlans.map((plan) => (
                <Grid
                  key={plan.name}
                  size={{ xs: 12, sm: 6, lg: 3 }}
                >
                  <motion.div
                    variants={reveal}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.15 }}
                    whileHover={{ y: -6 }}
                    style={{ height: "100%" }}
                  >
                    <Card
                      sx={{
                        height: "100%",
                        p: { xs: 3, md: 3.5 },
                        display: "flex",
                        flexDirection: "column",
                        position: "relative",
                        overflow: "visible",
                        border: "1px solid",
                        borderColor: "divider",
                        transition: "border-color 180ms ease, box-shadow 180ms ease",
                        "&:hover": {
                          borderColor: "primary.main",
                          boxShadow: (theme) => `
                            0 20px 30px -10px ${theme.palette.primary.main}25,
                            0 10px 15px -5px ${theme.palette.primary.main}15,
                            0 0 0 1px ${theme.palette.primary.main}30
                          `,
                        },
                      }}
                    >
                      <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                      >
                        <Typography
                          variant="h5"
                          fontWeight={900}
                        >
                          {plan.name}
                        </Typography>
                      </Stack>

                      <Typography
                        color="text.secondary"
                        sx={{
                          mt: 1,
                          minHeight: 48,
                        }}
                      >
                        {yearly ? plan.yearlyText : plan.monthlyText}
                      </Typography>

                      <Stack
                        direction="row"
                        alignItems="baseline"
                        spacing={0.5}
                        sx={{ mt: 3, mb: 3 }}
                      >
                        {(yearly ? plan.yearlyPrice : plan.monthlyPrice) !== null ? (
                          <>
                            <Typography
                              fontSize="3rem"
                              fontWeight={900}
                              letterSpacing="-.06em"
                            >
                              {new Intl.NumberFormat(undefined, {
                                style: "currency",
                                currency: yearly
                                  ? plan.yearlyCurrency
                                  : plan.monthlyCurrency,
                              }).format(yearly ? plan.yearlyPrice : plan.monthlyPrice)}
                            </Typography>

                            <Typography color="text.secondary">
                              / {yearly ? "year" : "month"}
                            </Typography>
                          </>
                        ) : (
                          <Typography
                            fontSize="2.6rem"
                            fontWeight={900}
                          >
                            Unavailable
                          </Typography>
                        )}
                      </Stack>

                      <Divider />

                      <Stack
                        spacing={1.25}
                        sx={{
                          flex: 1,
                          py: 3,
                        }}
                      >
                        {(yearly ? plan.yearlyFeatures : plan.monthlyFeatures).map((feature) => (
                          <Stack
                            key={feature}
                            direction="row"
                            spacing={1}
                          >
                            <CheckCircle
                              sx={{
                                fontSize: 19,
                              }}
                            />

                            <Typography variant="body2">
                              {feature}
                            </Typography>
                          </Stack>
                        ))}
                      </Stack>

                      <Button
                        component={Link}
                        href={planHref(plan)}
                        disabled={!(yearly ? plan.yearlyPlanId : plan.monthlyPlanId)}
                        fullWidth
                        size="medium"
                        variant="contained"
                        disableElevation
                      >
                        {plan.action}
                      </Button>
                    </Card>
                  </motion.div>
                </Grid>
              ))}
            </Grid>

            <Box sx={{ mt: { xs: 8, md: 11 } }}>
              <Box sx={{ textAlign: "center", mb: 4 }}>
                <Typography
                  variant="h4"
                  fontWeight={900}
                  letterSpacing="-.04em"
                >
                  Compare Plans
                </Typography>
                <Typography sx={{ mt: 1 }}>
                  See which plan includes the tools your team needs.
                </Typography>
              </Box>

              <Box
                sx={{
                  overflowX: "auto",
                  border: "1px solid var(--mui-palette-divider)",
                  borderRadius: "var(--mui-shape-borderRadius)",
                }}
              >
                <Box sx={{ minWidth: 760 }}>
                  <Grid
                    container
                    sx={{
                      px: { xs: 2, md: 3 },
                      py: 2,
                      borderBottom: "1px solid var(--mui-palette-divider)",
                      backgroundColor: "var(--mui-palette-background-paper)",
                    }}
                  >
                    <Grid size={5}>
                      <Typography
                        fontWeight={800}
                      >
                        Features
                      </Typography>
                    </Grid>
                    {pricingPlans.map((plan) => (
                      <Grid key={plan.name} size={1.75}>
                        <Typography
                          align="center"
                          fontWeight={800}
                        >
                          {plan.name}
                        </Typography>
                      </Grid>
                    ))}
                  </Grid>

                  {compareRows.map(([feature, availability], index) => (
                    <Grid
                      container
                      key={feature}
                      sx={{
                        px: { xs: 2, md: 3 },
                        py: 1.6,
                        borderBottom: index === compareRows.length - 1 ? "0" : "1px solid var(--mui-palette-divider)",
                      }}
                    >
                      <Grid size={5}>
                        <Typography
                          variant="body2"
                        >
                          {feature}
                        </Typography>
                      </Grid>
                        {pricingPlans.map((plan, planIndex) => (
                        <Grid
                          key={`${feature}-${plan.name}`}
                          size={1.75}
                          sx={{
                            display: "flex",
                            justifyContent: "center",
                          }}
                        >
                          {(availability[planIndex] ?? false) ? (
                            <CheckCircle
                              sx={{ color: "var(--mui-palette-primary-main)", fontSize: 20 }}
                            />
                          ) : (
                            <Typography
                              sx={{ color: "var(--mui-palette-text-secondary)" }}
                            >
                              —
                            </Typography>
                          )}
                        </Grid>
                      ))}
                    </Grid>
                  ))}
                </Box>
              </Box>
            </Box>
          </Container>
        </Box>

        <Box
          id="resources"
          sx={{
            py: { xs: 9, md: 12 },
            scrollMarginTop: 92,
          }}
        >
          <Container maxWidth="xl">
            <Box
              sx={{
                textAlign: "center",
                maxWidth: 600,
                mx: "auto",
                mb: 5,
              }}
            >
              <Typography
                variant="h3"
                fontWeight={900}
                letterSpacing="-.05em"
              >
                Built for modern HR teams
              </Typography>
            </Box>

            <Grid container spacing={3}>
              {[
                [
                  "Maya Chen",
                  "People Operations Lead, Vertex",
                  "SKL HR has completely simplified how we manage attendance and leave. Our HR team saves hours every week.",
                ],
                [
                  "James Wilson",
                  "HR Director, Northstar",
                  "We finally have a single, reliable source of truth for every employee record and HR workflow.",
                ],
                [
                  "Nina Patel",
                  "Operations Manager, Brightline",
                  "The employee self-service experience made a noticeable difference from the first week.",
                ],
              ].map(([name, role, quote]) => (
                <Grid
                  key={name}
                  size={{ xs: 12, md: 4 }}
                >
                  <Card
                    sx={{
                      height: "100%",
                      p: 3.25,
                      borderRadius:
                        "var(--mui-shape-borderRadius)",
                    }}
                  >
                    <Typography
                      sx={{
                        color: "text.secondary",
                        lineHeight: 1.75,
                      }}
                    >
                      &ldquo;{quote}&rdquo;
                    </Typography>

                    <Stack
                      direction="row"
                      spacing={1.25}
                      alignItems="center"
                      sx={{ mt: 3 }}
                    >
                      <Avatar sx={{ fontWeight: 850 }}>
                        {name[0]}
                      </Avatar>

                      <Box>
                        <Typography fontWeight={850}>
                          {name}
                        </Typography>

                        <Typography
                          variant="caption"
                          color="text.secondary"
                        >
                          {role}
                        </Typography>
                      </Box>
                    </Stack>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <Box
              sx={{
                maxWidth: 800,
                mx: "auto",
                mt: 9,
              }}
            >
              <Typography
                variant="h4"
                fontWeight={900}
                textAlign="center"
                sx={{ mb: 3 }}
              >
                Frequently asked questions
              </Typography>

              {[
                "Can I try SKL HR for free?",
                "Can I upgrade or downgrade my plan?",
                "Can employees access their own accounts?",
                "Does Standard include payroll?",
                "Can managers approve leave requests?",
                "Is my employee data secure?",
              ].map((question, index) => (
                <Accordion
                  key={question}
                  sx={{
                    mb: 1.25,
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMore />}
                  >
                    <Typography fontWeight={750}>
                      {question}
                    </Typography>
                  </AccordionSummary>

                  <AccordionDetails>
                    <Typography color="text.secondary">
                      Yes. SKL HR is built to give HR teams and
                      employees the right tools and access for their
                      role, while keeping information centralized and
                      secure.
                    </Typography>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          </Container>
        </Box>

        <Container
          maxWidth="xl"
          sx={{ py: { xs: 9, md: 12 } }}
        >
          <Card
            sx={{
              position: "relative",
              overflow: "hidden",
              p: { xs: 4, md: 7 },
              textAlign: "center",
            }}
          >
            <Box
              sx={{
                position: "absolute",
                width: 300,
                height: 300,
                borderRadius: "50%",
                backgroundColor: "primary.main",
                opacity: 0.08,
                top: -170,
                right: -80,
              }}
            />

            <Typography
              variant="h3"
              fontWeight={900}
              letterSpacing="-.05em"
              sx={{ position: "relative" }}
            >
              Make HR simpler for everyone.
            </Typography>

            <Typography
              sx={{
                position: "relative",
                maxWidth: 580,
                mx: "auto",
                mt: 1.5,
              }}
            >
              Spend less time managing paperwork and more time
              managing your people.
            </Typography>

            {authChecked && !isAuthenticated && (
              <Button
                component={Link}
                href="/register"
                variant="contained"
                size="large"
                endIcon={
                  <ArrowForward
                    sx={{ color: "inherit !important" }}
                  />
                }
                sx={{
                  textTransform: "none",
                  fontWeight: 850,
                  mt: 2,
                }}
              >
                Start Your Free Trial
              </Button>
            )}

            <Typography
              variant="caption"
              sx={{
                position: "relative",
                display: "block",
                mt: 2,
              }}
            >
              No credit card required. Set up your HR workspace in
              minutes.
            </Typography>
          </Card>
        </Container>
      </Box>

      <Box component="footer" sx={{ pt: 7, pb: 3 }}>
        <Container maxWidth="xl">
          <Grid container spacing={4}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
              >
                <Box
                  sx={{
                    display: "grid",
                    placeItems: "center",
                    width: 32,
                    height: 32,
                    borderRadius:
                      "var(--mui-shape-borderRadius)",
                    backgroundColor: "primary.main",
                    fontWeight: 900,
                  }}
                >
                  H
                </Box>

                <Typography
                  variant="h6"
                  fontWeight={900}
                >
                  SKL HR
                </Typography>
              </Stack>

              <Typography
                variant="body2"
                sx={{
                  maxWidth: 260,
                  mt: 2,
                  lineHeight: 1.7,
                }}
              >
                A modern HR platform that helps teams manage people
                with clarity and confidence.
              </Typography>
            </Grid>

            {[
              ["Product", ["Features", "Solutions", "Pricing"]],
              [
                "Resources",
                ["Help Center", "Guides", "Contact"],
              ],
              [
                "Company",
                ["About", "Privacy Policy", "Terms of Service"],
              ],
            ].map(([title, links]) => (
              <Grid
                key={title}
                size={{ xs: 6, md: 2 }}
              >
                <Typography fontWeight={800}>
                  {title}
                </Typography>

                <Stack spacing={1} sx={{ mt: 1.5 }}>
                  {links.map((item) => (
                    <Typography
                      key={item}
                      variant="body2"
                    >
                      {item}
                    </Typography>
                  ))}
                </Stack>
              </Grid>
            ))}
          </Grid>

          <Divider sx={{ my: 5 }} />

          <Typography variant="caption">
            © {new Date().getFullYear()} SKL HR. All rights
            reserved.
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}