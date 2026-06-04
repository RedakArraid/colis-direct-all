package ci.colisdirect.app.ui.navigation

import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.activity.ComponentActivity
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.NavHostController
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import ci.colisdirect.app.domain.ProfileVisibility
import ci.colisdirect.app.domain.UserRoles
import ci.colisdirect.app.ui.screens.MainContainerScreen
import ci.colisdirect.app.ui.screens.SplashScreen
import ci.colisdirect.app.ui.screens.client.CreateShipmentScreen
import ci.colisdirect.app.ui.screens.client.PayCardScreen
import ci.colisdirect.app.ui.screens.client.PayMobileMoneyScreen
import ci.colisdirect.app.ui.screens.client.PaySuccessScreen
import ci.colisdirect.app.ui.screens.client.PaymentMethodScreen
import ci.colisdirect.app.ui.screens.client.ShipmentDetailScreen
import ci.colisdirect.app.data.api.model.RecipientAddressDto
import ci.colisdirect.app.ui.screens.admin.AdminMainScreen
import ci.colisdirect.app.ui.screens.admin.SupportMainScreen
import ci.colisdirect.app.ui.screens.courier.CourierMainScreen
import ci.colisdirect.app.ui.screens.relay.RelayMainScreen
import ci.colisdirect.app.ui.screens.mobile.AddressBookScreen
import ci.colisdirect.app.ui.screens.mobile.NotificationsScreen
import ci.colisdirect.app.ui.screens.mobile.PartnerScreen
import ci.colisdirect.app.ui.screens.mobile.PaymentHistoryScreen
import ci.colisdirect.app.ui.screens.mobile.PricingScreen
import ci.colisdirect.app.ui.screens.relay.DeliveryConfirmScreen
import ci.colisdirect.app.ui.screens.relay.RelayIntakeScreen
import ci.colisdirect.app.ui.screens.transporter.HomePickupScreen
import ci.colisdirect.app.ui.screens.transporter.PickupScanScreen
import ci.colisdirect.app.viewmodel.AuthViewModel
import ci.colisdirect.app.viewmodel.ClientViewModel

val LocalClientViewModel = compositionLocalOf<ClientViewModel?> { null }

@Composable
fun appClientViewModel(): ClientViewModel {
    LocalClientViewModel.current?.let { return it }
    return hiltViewModel()
}

object Routes {
    const val SPLASH = "splash"
    const val MAIN_CONTAINER = "main_container"
    const val COURIER_MAIN = "courier_main"
    const val RELAY_MAIN = "relay_main"
    const val ADMIN_MAIN = "admin_main"
    const val SUPPORT_MAIN = "support_main"
    const val NOTIFICATIONS = "notifications"
    const val PRICING = "pricing"
    const val PARTNER = "partner?partnerType={partnerType}"
    const val ADDRESS_BOOK = "address_book?forSelection={forSelection}"
    const val PAYMENT_HISTORY = "payment_history"

    fun partnerRoute(partnerType: String? = null): String =
        if (partnerType.isNullOrBlank()) "partner?partnerType=" else "partner?partnerType=$partnerType"

    fun addressBookRoute(forSelection: Boolean = false): String =
        "address_book?forSelection=$forSelection"

    const val SHIPMENT_DETAIL = "shipment_detail/{shipmentId}"
    const val CREATE_SHIPMENT = "create_shipment"
    const val PICKUP_SCAN = "pickup_scan"
    const val HOME_PICKUP = "home_pickup"
    const val RELAY_INTAKE = "relay_intake"
    const val DELIVERY_CONFIRM = "delivery_confirm"

    const val PAYMENT_METHOD = "payment_method/{trackingNumber}/{amountFcfa}/{routeLabel}"
    const val PAYMENT_MOBILE = "payment_mobile/{trackingNumber}/{amountFcfa}/{operator}"
    const val PAYMENT_CARD = "payment_card/{trackingNumber}/{amountFcfa}"
    const val PAYMENT_SUCCESS = "payment_success/{trackingNumber}?relayCash={relayCash}"

    fun paymentMethodRoute(tracking: String, amount: Int, routeLabel: String): String {
        val safeLabel = routeLabel.replace("/", "-").replace(" ", "_")
        return "payment_method/$tracking/$amount/$safeLabel"
    }

    fun paymentMobileRoute(tracking: String, amount: Int, operator: String): String =
        "payment_mobile/$tracking/$amount/$operator"

    fun paymentCardRoute(tracking: String, amount: Int): String =
        "payment_card/$tracking/$amount"

    fun paymentSuccessRoute(tracking: String, relayCash: Boolean = false): String =
        "payment_success/$tracking?relayCash=$relayCash"
}

private fun NavHostController.navigateToDedicatedShell(
    role: String?,
    popUpToRoute: String,
    popInclusive: Boolean,
) {
    val dest = when (ProfileVisibility.dedicatedShellRoute(role)) {
        "courier_main" -> Routes.COURIER_MAIN
        "relay_main" -> Routes.RELAY_MAIN
        "admin_main" -> Routes.ADMIN_MAIN
        "support_main" -> Routes.SUPPORT_MAIN
        else -> return
    }
    navigate(dest) {
        popUpTo(popUpToRoute) { inclusive = popInclusive }
    }
}

@Composable
fun AppNavGraph() {
    val navController = rememberNavController()
    val authViewModel: AuthViewModel = hiltViewModel()
    val activity = LocalContext.current as ComponentActivity
    val clientViewModel: ClientViewModel = hiltViewModel(activity)
    var trackingPrefillFromNotif by remember { mutableStateOf<String?>(null) }

    CompositionLocalProvider(LocalClientViewModel provides clientViewModel) {
    NavHost(
        navController = navController,
        startDestination = Routes.SPLASH,
        enterTransition = { slideInHorizontally(initialOffsetX = { it }) + fadeIn() },
        exitTransition = { slideOutHorizontally(targetOffsetX = { -it }) + fadeOut() },
        popEnterTransition = { slideInHorizontally(initialOffsetX = { -it }) + fadeIn() },
        popExitTransition = { slideOutHorizontally(targetOffsetX = { it }) + fadeOut() },
    ) {
        composable(Routes.SPLASH) {
            SplashScreen(
                authViewModel = authViewModel,
                onNavigate = { role ->
                    if (ProfileVisibility.usesDedicatedShell(role)) {
                        navController.navigateToDedicatedShell(role, Routes.SPLASH, popInclusive = true)
                    } else {
                        navController.navigate(Routes.MAIN_CONTAINER) {
                            popUpTo(Routes.SPLASH) { inclusive = true }
                        }
                    }
                },
                onNotLoggedIn = {
                    navController.navigate(Routes.MAIN_CONTAINER) {
                        popUpTo(Routes.SPLASH) { inclusive = true }
                    }
                },
            )
        }

        composable(Routes.COURIER_MAIN) {
            CourierMainScreen(
                onLogout = {
                    authViewModel.signOut()
                    navController.navigate(Routes.MAIN_CONTAINER) {
                        popUpTo(Routes.COURIER_MAIN) { inclusive = true }
                    }
                },
                onPickupEntry = { navController.navigate(Routes.PICKUP_SCAN) },
            )
        }

        composable(Routes.RELAY_MAIN) {
            RelayMainScreen(
                onLogout = {
                    authViewModel.signOut()
                    navController.navigate(Routes.MAIN_CONTAINER) {
                        popUpTo(Routes.RELAY_MAIN) { inclusive = true }
                    }
                },
                onIntakeEntry = { navController.navigate(Routes.RELAY_INTAKE) },
                onDeliveryEntry = { navController.navigate(Routes.DELIVERY_CONFIRM) },
            )
        }

        composable(Routes.ADMIN_MAIN) {
            AdminMainScreen(
                onLogout = {
                    authViewModel.signOut()
                    navController.navigate(Routes.MAIN_CONTAINER) {
                        popUpTo(Routes.ADMIN_MAIN) { inclusive = true }
                    }
                },
            )
        }

        composable(Routes.SUPPORT_MAIN) {
            SupportMainScreen(
                onLogout = {
                    authViewModel.signOut()
                    navController.navigate(Routes.MAIN_CONTAINER) {
                        popUpTo(Routes.SUPPORT_MAIN) { inclusive = true }
                    }
                },
            )
        }

        composable(Routes.MAIN_CONTAINER) {
            MainContainerScreen(
                onStaffLogin = { role ->
                    navController.navigateToDedicatedShell(role, Routes.MAIN_CONTAINER, popInclusive = true)
                },
                onCreateShipment = { navController.navigate(Routes.CREATE_SHIPMENT) },
                onShipmentClick = { id -> navController.navigate("shipment_detail/$id") },
                onNotifications = { navController.navigate(Routes.NOTIFICATIONS) },
                onIntakeScan = { navController.navigate(Routes.RELAY_INTAKE) },
                onDeliveryConfirm = { navController.navigate(Routes.DELIVERY_CONFIRM) },
                onPickupScan = { navController.navigate(Routes.PICKUP_SCAN) },
                onHomePickup = { navController.navigate(Routes.HOME_PICKUP) },
                onOpenPricing = { navController.navigate(Routes.PRICING) },
                onOpenPartner = { type -> navController.navigate(Routes.partnerRoute(type)) },
                onOpenAddressBook = { navController.navigate(Routes.addressBookRoute(forSelection = false)) },
                onOpenPaymentHistory = { navController.navigate(Routes.PAYMENT_HISTORY) },
                onPayShipmentOnline = { tracking, amount, routeLabel ->
                    navController.navigate(Routes.paymentMethodRoute(tracking, amount, routeLabel))
                },
                initialTrackingPrefill = trackingPrefillFromNotif,
                onTrackingPrefillConsumed = { trackingPrefillFromNotif = null },
            )
        }

        composable(Routes.PRICING) {
            PricingScreen(onBack = { navController.popBackStack() })
        }

        composable(
            route = Routes.PARTNER,
            arguments = listOf(
                navArgument("partnerType") {
                    type = NavType.StringType
                    defaultValue = ""
                },
            ),
        ) { backStack ->
            val partnerType = backStack.arguments?.getString("partnerType").orEmpty().ifBlank { null }
            PartnerScreen(
                onBack = { navController.popBackStack() },
                initialPartnerType = partnerType,
            )
        }

        composable(
            route = Routes.ADDRESS_BOOK,
            arguments = listOf(
                navArgument("forSelection") {
                    type = NavType.BoolType
                    defaultValue = false
                },
            ),
        ) { backStack ->
            val forSelection = backStack.arguments?.getBoolean("forSelection") ?: false
            AddressBookScreen(
                onBack = { navController.popBackStack() },
                selectionMode = forSelection,
                onSelect = if (forSelection) {
                    { addr: RecipientAddressDto ->
                        navController.previousBackStackEntry?.savedStateHandle?.apply {
                            set("book_r_fname", addr.firstName)
                            set("book_r_lname", addr.lastName)
                            set("book_r_email", addr.email.orEmpty())
                            set("book_r_phone", addr.phone)
                            set("book_r_commune", addr.commune)
                            set("book_r_quartier", addr.quartier.orEmpty())
                            set("book_r_address", addr.address)
                            set("book_applied", true)
                        }
                        navController.popBackStack()
                    }
                } else null,
                onCreateShipment = if (!forSelection) {
                    { navController.navigate(Routes.CREATE_SHIPMENT) }
                } else null,
            )
        }

        composable(Routes.PAYMENT_HISTORY) {
            PaymentHistoryScreen(onBack = { navController.popBackStack() })
        }

        composable(Routes.NOTIFICATIONS) {
            NotificationsScreen(
                onBack = { navController.popBackStack() },
                onLoginClick = { navController.popBackStack() },
                onTrackingClick = { tn ->
                    trackingPrefillFromNotif = tn
                    navController.popBackStack()
                },
            )
        }

        composable(
            route = Routes.SHIPMENT_DETAIL,
            arguments = listOf(navArgument("shipmentId") { type = NavType.StringType }),
        ) { backStack ->
            val id = backStack.arguments?.getString("shipmentId") ?: return@composable
            ShipmentDetailScreen(
                shipmentId = id,
                onBack = { navController.popBackStack() },
                onCancelled = { navController.popBackStack() },
                onPayOnline = { tracking, amount, routeLabel ->
                    navController.navigate(Routes.paymentMethodRoute(tracking, amount, routeLabel))
                },
            )
        }

        composable(Routes.CREATE_SHIPMENT) { backStack ->
            CreateShipmentScreen(
                onBack = { navController.popBackStack() },
                onSuccess = {
                    navController.popBackStack(Routes.CREATE_SHIPMENT, inclusive = true)
                },
                savedStateHandle = backStack.savedStateHandle,
                onOpenAddressBook = { navController.navigate(Routes.addressBookRoute(forSelection = true)) },
                onNavigateToPayment = { tracking, amount, routeLabel ->
                    navController.navigate(Routes.paymentMethodRoute(tracking, amount, routeLabel))
                },
                onNavigateToCheckout = { tracking, relayCash ->
                    navController.navigate(Routes.paymentSuccessRoute(tracking, relayCash)) {
                        popUpTo(Routes.CREATE_SHIPMENT) { inclusive = true }
                    }
                },
            )
        }

        composable(
            route = Routes.PAYMENT_METHOD,
            arguments = listOf(
                navArgument("trackingNumber") { type = NavType.StringType },
                navArgument("amountFcfa") { type = NavType.IntType },
                navArgument("routeLabel") { type = NavType.StringType },
            ),
        ) { backStack ->
            val tracking = backStack.arguments?.getString("trackingNumber") ?: return@composable
            val amount = backStack.arguments?.getInt("amountFcfa") ?: 0
            val routeLabel = backStack.arguments?.getString("routeLabel")
                ?.replace("_to_", " → ")
                ?.replace("_", " ")
                ?: ""
            PaymentMethodScreen(
                trackingNumber = tracking,
                amountFcfa = amount,
                routeLabel = routeLabel,
                onBack = { navController.popBackStack() },
                onMobileMoney = { op ->
                    navController.navigate(Routes.paymentMobileRoute(tracking, amount, op))
                },
                onCard = { navController.navigate(Routes.paymentCardRoute(tracking, amount)) },
                onCashDone = { navController.navigate(Routes.paymentSuccessRoute(tracking)) },
            )
        }

        composable(
            route = Routes.PAYMENT_MOBILE,
            arguments = listOf(
                navArgument("trackingNumber") { type = NavType.StringType },
                navArgument("amountFcfa") { type = NavType.IntType },
                navArgument("operator") { type = NavType.StringType },
            ),
        ) { backStack ->
            val tracking = backStack.arguments?.getString("trackingNumber") ?: return@composable
            val amount = backStack.arguments?.getInt("amountFcfa") ?: 0
            val operator = backStack.arguments?.getString("operator") ?: "om"
            PayMobileMoneyScreen(
                trackingNumber = tracking,
                amountFcfa = amount,
                operator = operator,
                onBack = { navController.popBackStack() },
                onSuccess = { navController.navigate(Routes.paymentSuccessRoute(tracking)) },
                viewModel = clientViewModel,
            )
        }

        composable(
            route = Routes.PAYMENT_CARD,
            arguments = listOf(
                navArgument("trackingNumber") { type = NavType.StringType },
                navArgument("amountFcfa") { type = NavType.IntType },
            ),
        ) { backStack ->
            val tracking = backStack.arguments?.getString("trackingNumber") ?: return@composable
            val amount = backStack.arguments?.getInt("amountFcfa") ?: 0
            PayCardScreen(
                trackingNumber = tracking,
                amountFcfa = amount,
                onBack = { navController.popBackStack() },
                onSuccess = { navController.navigate(Routes.paymentSuccessRoute(tracking)) },
                viewModel = clientViewModel,
            )
        }

        composable(
            route = Routes.PAYMENT_SUCCESS,
            arguments = listOf(
                navArgument("trackingNumber") { type = NavType.StringType },
                navArgument("relayCash") {
                    type = NavType.BoolType
                    defaultValue = false
                },
            ),
        ) { backStack ->
            val tracking = backStack.arguments?.getString("trackingNumber") ?: return@composable
            val relayCash = backStack.arguments?.getBoolean("relayCash") ?: false
            PaySuccessScreen(
                trackingNumber = tracking,
                isRelayCashCheckout = relayCash,
                onTrackShipment = { tn ->
                    trackingPrefillFromNotif = tn
                    navController.navigate(Routes.MAIN_CONTAINER) {
                        popUpTo(Routes.MAIN_CONTAINER) { inclusive = true }
                    }
                },
                onDone = {
                    clientViewModel.loadShipments()
                    navController.navigate(Routes.MAIN_CONTAINER) {
                        popUpTo(Routes.MAIN_CONTAINER) { inclusive = true }
                    }
                },
                viewModel = clientViewModel,
            )
        }

        composable(Routes.PICKUP_SCAN) {
            PickupScanScreen(
                onBack = { navController.popBackStack() },
                onSuccess = { navController.popBackStack() },
            )
        }

        composable(Routes.HOME_PICKUP) {
            HomePickupScreen(
                onBack = { navController.popBackStack() },
                onSuccess = { navController.popBackStack() },
            )
        }

        composable(Routes.RELAY_INTAKE) {
            RelayIntakeScreen(
                onBack = { navController.popBackStack() },
                onSuccess = { navController.popBackStack() },
            )
        }

        composable(Routes.DELIVERY_CONFIRM) {
            DeliveryConfirmScreen(
                onBack = { navController.popBackStack() },
                onSuccess = { navController.popBackStack() },
            )
        }
    }
    }
}
