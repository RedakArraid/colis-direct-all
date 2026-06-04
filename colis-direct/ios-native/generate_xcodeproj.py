#!/usr/bin/env python3
"""
Generate a minimal Xcode project (.xcodeproj) for ColisDirectApp.
This script creates the proper pbxproj structure so Xcode can build the project.
"""

import os
import uuid
import json

# ──────────────────────────────────────────────────────────────
# Helper to generate Xcode UUIDs (24 hex chars, uppercase)
# ──────────────────────────────────────────────────────────────
def xuid():
    return uuid.uuid4().hex[:24].upper()

# ──────────────────────────────────────────────────────────────
# Discover Swift source files
# ──────────────────────────────────────────────────────────────
SOURCES_ROOT = os.path.join(os.path.dirname(__file__), "ColisDirectApp", "Sources")
PROJECT_ROOT = os.path.join(os.path.dirname(__file__), "ColisDirectApp")

swift_files = []
for root, dirs, files in os.walk(SOURCES_ROOT):
    for f in files:
        if f.endswith(".swift"):
            rel = os.path.relpath(os.path.join(root, f), PROJECT_ROOT)
            swift_files.append(rel)

swift_files.sort()
print(f"Found {len(swift_files)} Swift files:")
for f in swift_files:
    print(f"  {f}")

# ──────────────────────────────────────────────────────────────
# Generate UUIDs for all objects
# ──────────────────────────────────────────────────────────────
# Project-level
proj_uuid          = xuid()   # PBXProject
main_group_uuid    = xuid()   # main group
sources_group_uuid = xuid()   # Sources group
products_group_uuid = xuid()  # Products group
frameworks_group_uuid = xuid()

# Target
app_target_uuid    = xuid()   # PBXNativeTarget
app_product_uuid   = xuid()   # file ref for .app
build_config_list_proj = xuid()
build_config_list_target = xuid()
debug_config_uuid  = xuid()
release_config_uuid = xuid()
debug_target_config_uuid = xuid()
release_target_config_uuid = xuid()

# Build phases
sources_phase_uuid = xuid()
frameworks_phase_uuid = xuid()
resources_phase_uuid = xuid()

# Per-file UUIDs
file_refs = {}   # rel_path -> file_ref_uuid
build_files = {} # rel_path -> build_file_uuid

for f in swift_files:
    file_refs[f] = xuid()
    build_files[f] = xuid()

# Info.plist
info_plist_ref = xuid()

# ──────────────────────────────────────────────────────────────
# Build the pbxproj content
# ──────────────────────────────────────────────────────────────
lines = []
def W(s=""):
    lines.append(s)

W("// !$*UTF8*$!")
W("{")
W("\tarchiveVersion = 1;")
W("\tclasses = {")
W("\t};")
W("\tobjectVersion = 56;")
W("\tobjects = {")
W()

# ── PBXBuildFile section ──
W("/* Begin PBXBuildFile section */")
for rel, bf_uuid in build_files.items():
    fr_uuid = file_refs[rel]
    name = os.path.basename(rel)
    W(f"\t\t{bf_uuid} /* {name} in Sources */ = {{isa = PBXBuildFile; fileRef = {fr_uuid} /* {name} */; }};")
W("/* End PBXBuildFile section */")
W()

# ── PBXFileReference section ──
W("/* Begin PBXFileReference section */")
W(f"\t\t{app_product_uuid} /* ColisDirectApp.app */ = {{isa = PBXFileReference; explicitFileType = wrapper.application; includeInIndex = 0; path = ColisDirectApp.app; sourceTree = BUILT_PRODUCTS_DIR; }};")
W(f"\t\t{info_plist_ref} /* Info.plist */ = {{isa = PBXFileReference; lastKnownFileType = text.plist.xml; path = Info.plist; sourceTree = \"<group>\"; }};")
for rel, fr_uuid in file_refs.items():
    name = os.path.basename(rel)
    W(f"\t\t{fr_uuid} /* {name} */ = {{isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = {name}; sourceTree = \"<group>\"; }};")
W("/* End PBXFileReference section */")
W()

# ── PBXFrameworksBuildPhase ──
W("/* Begin PBXFrameworksBuildPhase section */")
W(f"\t\t{frameworks_phase_uuid} /* Frameworks */ = {{")
W("\t\t\tisa = PBXFrameworksBuildPhase;")
W("\t\t\tbuildActionMask = 2147483647;")
W("\t\t\tfiles = (")
W("\t\t\t);")
W("\t\t\trunOnlyForDeploymentPostprocessing = 0;")
W("\t\t};")
W("/* End PBXFrameworksBuildPhase section */")
W()

# ── PBXGroup section ──
W("/* Begin PBXGroup section */")

# Build a tree of groups
# We need groups per subdirectory under Sources/
group_map = {}  # subdir -> uuid

def make_group_for(subdir):
    if subdir not in group_map:
        group_map[subdir] = xuid()
    return group_map[subdir]

# Collect all subdirs
subdirs = set()
for rel in swift_files:
    parts = rel.replace("\\", "/").split("/")
    # parts[0] = "Sources", parts[1..] = subpath
    for i in range(1, len(parts)):
        subdirs.add("/".join(parts[:i+1]))

# Sort for determinism
subdirs = sorted(subdirs)

# For each group, figure out children
def children_of(parent_path):
    """Return immediate children (files + groups) of parent_path"""
    result_files = []
    result_groups = []
    for rel in swift_files:
        parts = rel.replace("\\", "/").split("/")
        parent_parts = parent_path.split("/") if parent_path else []
        if len(parts) == len(parent_parts) + 1 and parts[:len(parent_parts)] == parent_parts:
            result_files.append(rel)
    for sd in subdirs:
        sd_parts = sd.split("/")
        parent_parts = parent_path.split("/") if parent_path else []
        if len(sd_parts) == len(parent_parts) + 1 and sd_parts[:len(parent_parts)] == parent_parts:
            result_groups.append(sd)
    return result_files, result_groups

# Main group
W(f"\t\t{main_group_uuid} /* ColisDirectApp */ = {{")
W("\t\t\tisa = PBXGroup;")
W("\t\t\tchildren = (")
W(f"\t\t\t\t{sources_group_uuid} /* Sources */,")
W(f"\t\t\t\t{products_group_uuid} /* Products */,")
W(f"\t\t\t\t{info_plist_ref} /* Info.plist */,")
W("\t\t\t);")
W("\t\t\tpath = ColisDirectApp;")
W("\t\t\tsourceTree = \"<group>\";")
W("\t\t};")

# Sources group (top-level "Sources" dir)
top_files, top_groups = children_of("Sources")
W(f"\t\t{sources_group_uuid} /* Sources */ = {{")
W("\t\t\tisa = PBXGroup;")
W("\t\t\tchildren = (")
for rel in top_files:
    fr = file_refs[rel]
    name = os.path.basename(rel)
    W(f"\t\t\t\t{fr} /* {name} */,")
for sg in top_groups:
    sg_uuid = make_group_for(sg)
    sg_name = sg.split("/")[-1]
    W(f"\t\t\t\t{sg_uuid} /* {sg_name} */,")
W("\t\t\t);")
W("\t\t\tpath = Sources;")
W("\t\t\tsourceTree = \"<group>\";")
W("\t\t};")

# Sub-groups (Data, Data/API, Data/Local, Data/Repository, ViewModels, Views, Views/Theme, etc.)
for sd in subdirs:
    sd_uuid = make_group_for(sd)
    sd_name = sd.split("/")[-1]
    sub_files, sub_groups = children_of(sd)
    W(f"\t\t{sd_uuid} /* {sd_name} */ = {{")
    W("\t\t\tisa = PBXGroup;")
    W("\t\t\tchildren = (")
    for rel in sub_files:
        fr = file_refs[rel]
        name = os.path.basename(rel)
        W(f"\t\t\t\t{fr} /* {name} */,")
    for sg in sub_groups:
        sg_uuid = make_group_for(sg)
        sg_name = sg.split("/")[-1]
        W(f"\t\t\t\t{sg_uuid} /* {sg_name} */,")
    W("\t\t\t);")
    W(f"\t\t\tpath = {sd_name};")
    W("\t\t\tsourceTree = \"<group>\";")
    W("\t\t};")

# Products group
W(f"\t\t{products_group_uuid} /* Products */ = {{")
W("\t\t\tisa = PBXGroup;")
W("\t\t\tchildren = (")
W(f"\t\t\t\t{app_product_uuid} /* ColisDirectApp.app */,")
W("\t\t\t);")
W("\t\t\tname = Products;")
W("\t\t\tsourceTree = \"<group>\";")
W("\t\t};")

W("/* End PBXGroup section */")
W()

# ── PBXNativeTarget ──
W("/* Begin PBXNativeTarget section */")
W(f"\t\t{app_target_uuid} /* ColisDirectApp */ = {{")
W("\t\t\tisa = PBXNativeTarget;")
W(f"\t\t\tbuildConfigurationList = {build_config_list_target} /* Build configuration list for PBXNativeTarget \"ColisDirectApp\" */;")
W("\t\t\tbuildPhases = (")
W(f"\t\t\t\t{sources_phase_uuid} /* Sources */,")
W(f"\t\t\t\t{frameworks_phase_uuid} /* Frameworks */,")
W(f"\t\t\t\t{resources_phase_uuid} /* Resources */,")
W("\t\t\t);")
W("\t\t\tbuildRules = (")
W("\t\t\t);")
W("\t\t\tdependencies = (")
W("\t\t\t);")
W("\t\t\tname = ColisDirectApp;")
W("\t\t\tpackageProductDependencies = (")
W("\t\t\t);")
W(f"\t\t\tproductName = ColisDirectApp;")
W(f"\t\t\tproductReference = {app_product_uuid} /* ColisDirectApp.app */;")
W("\t\t\tproductType = \"com.apple.product-type.application\";")
W("\t\t};")
W("/* End PBXNativeTarget section */")
W()

# ── PBXProject ──
W("/* Begin PBXProject section */")
W(f"\t\t{proj_uuid} /* Project object */ = {{")
W("\t\t\tisa = PBXProject;")
W("\t\t\tattributes = {")
W("\t\t\t\tBuildIndependentTargetsInParallel = 1;")
W("\t\t\t\tLastSwiftUpdateCheck = 1530;")
W("\t\t\t\tLastUpgradeCheck = 1530;")
W("\t\t\t\tTargetAttributes = {")
W(f"\t\t\t\t\t{app_target_uuid} = {{")
W("\t\t\t\t\t\tCreatedOnToolsVersion = 15.3;")
W("\t\t\t\t\t};")
W("\t\t\t\t};")
W("\t\t\t};")
W(f"\t\t\tbuildConfigurationList = {build_config_list_proj} /* Build configuration list for PBXProject \"ColisDirectApp\" */;")
W("\t\t\tcompatibilityVersion = \"Xcode 14.0\";")
W("\t\t\tdevelopmentRegion = fr;")
W("\t\t\thasScannedForEncodings = 0;")
W("\t\t\tknownRegions = (")
W("\t\t\t\ten,")
W("\t\t\t\tfr,")
W("\t\t\t\tBase,")
W("\t\t\t);")
W(f"\t\t\tmainGroup = {main_group_uuid};")
W(f"\t\t\tproductRefGroup = {products_group_uuid} /* Products */;")
W("\t\t\tprojectDirPath = \"\";")
W("\t\t\tprojectRoot = \"\";")
W("\t\t\ttargets = (")
W(f"\t\t\t\t{app_target_uuid} /* ColisDirectApp */,")
W("\t\t\t);")
W("\t\t};")
W("/* End PBXProject section */")
W()

# ── PBXResourcesBuildPhase ──
W("/* Begin PBXResourcesBuildPhase section */")
W(f"\t\t{resources_phase_uuid} /* Resources */ = {{")
W("\t\t\tisa = PBXResourcesBuildPhase;")
W("\t\t\tbuildActionMask = 2147483647;")
W("\t\t\tfiles = (")
W("\t\t\t);")
W("\t\t\trunOnlyForDeploymentPostprocessing = 0;")
W("\t\t};")
W("/* End PBXResourcesBuildPhase section */")
W()

# ── PBXSourcesBuildPhase ──
W("/* Begin PBXSourcesBuildPhase section */")
W(f"\t\t{sources_phase_uuid} /* Sources */ = {{")
W("\t\t\tisa = PBXSourcesBuildPhase;")
W("\t\t\tbuildActionMask = 2147483647;")
W("\t\t\tfiles = (")
for rel, bf_uuid in build_files.items():
    name = os.path.basename(rel)
    W(f"\t\t\t\t{bf_uuid} /* {name} in Sources */,")
W("\t\t\t);")
W("\t\t\trunOnlyForDeploymentPostprocessing = 0;")
W("\t\t};")
W("/* End PBXSourcesBuildPhase section */")
W()

# ── XCBuildConfiguration ──
W("/* Begin XCBuildConfiguration section */")

BUNDLE_ID = "ci.colisdirect.app.ios"

# Project Debug config
W(f"\t\t{debug_config_uuid} /* Debug */ = {{")
W("\t\t\tisa = XCBuildConfiguration;")
W("\t\t\tbuildSettings = {")
W("\t\t\t\tALWAYS_SEARCH_USER_PATHS = NO;")
W("\t\t\t\tASSET_CATALOG_COMPILER_OPTIMIZATION = space;")
W("\t\t\t\tCLANG_ANALYZER_NONNULL = YES;")
W("\t\t\t\tCLANG_CXX_LANGUAGE_STANDARD = \"gnu++20\";")
W("\t\t\t\tCLANG_ENABLE_MODULES = YES;")
W("\t\t\t\tCLANG_ENABLE_OBJC_ARC = YES;")
W("\t\t\t\tCOPY_PHASE_STRIP = NO;")
W("\t\t\t\tDEBUG_INFORMATION_FORMAT = dwarf;")
W("\t\t\t\tENABLE_STRICT_OBJC_MSGSEND = YES;")
W("\t\t\t\tENABLE_TESTABILITY = YES;")
W("\t\t\t\tGCC_C_LANGUAGE_STANDARD = gnu17;")
W("\t\t\t\tGCC_DYNAMIC_NO_PIC = NO;")
W("\t\t\t\tGCC_OPTIMIZATION_LEVEL = 0;")
W("\t\t\t\tGCC_PREPROCESSOR_DEFINITIONS = (")
W("\t\t\t\t\t\"DEBUG=1\",")
W("\t\t\t\t\t\"$(inherited)\",")
W("\t\t\t\t);")
W("\t\t\t\tIPHONEOS_DEPLOYMENT_TARGET = 17.0;")
W("\t\t\t\tMTL_ENABLE_DEBUG_INFO = INCLUDE_SOURCE;")
W("\t\t\t\tMTL_FAST_MATH = YES;")
W("\t\t\t\tONLY_ACTIVE_ARCH = YES;")
W("\t\t\t\tSDKROOT = iphoneos;")
W("\t\t\t\tSWIFT_ACTIVE_COMPILATION_CONDITIONS = DEBUG;")
W("\t\t\t\tSWIFT_OPTIMIZATION_LEVEL = \"-Onone\";")
W("\t\t\t};")
W("\t\t\tname = Debug;")
W("\t\t};")

# Project Release config
W(f"\t\t{release_config_uuid} /* Release */ = {{")
W("\t\t\tisa = XCBuildConfiguration;")
W("\t\t\tbuildSettings = {")
W("\t\t\t\tALWAYS_SEARCH_USER_PATHS = NO;")
W("\t\t\t\tASSET_CATALOG_COMPILER_OPTIMIZATION = space;")
W("\t\t\t\tCLANG_ANALYZER_NONNULL = YES;")
W("\t\t\t\tCLANG_CXX_LANGUAGE_STANDARD = \"gnu++20\";")
W("\t\t\t\tCLANG_ENABLE_MODULES = YES;")
W("\t\t\t\tCLANG_ENABLE_OBJC_ARC = YES;")
W("\t\t\t\tCOPY_PHASE_STRIP = NO;")
W("\t\t\t\tDEBUG_INFORMATION_FORMAT = \"dwarf-with-dsym\";")
W("\t\t\t\tENABLE_NS_ASSERTIONS = NO;")
W("\t\t\t\tENABLE_STRICT_OBJC_MSGSEND = YES;")
W("\t\t\t\tGCC_C_LANGUAGE_STANDARD = gnu17;")
W("\t\t\t\tIPHONEOS_DEPLOYMENT_TARGET = 17.0;")
W("\t\t\t\tMTL_ENABLE_DEBUG_INFO = NO;")
W("\t\t\t\tMTL_FAST_MATH = YES;")
W("\t\t\t\tSDKROOT = iphoneos;")
W("\t\t\t\tSWIFT_COMPILATION_MODE = wholemodule;")
W("\t\t\t\tSWIFT_OPTIMIZATION_LEVEL = \"-O\";")
W("\t\t\t\tVALIDATE_PRODUCT = YES;")
W("\t\t\t};")
W("\t\t\tname = Release;")
W("\t\t};")

# Target Debug config
W(f"\t\t{debug_target_config_uuid} /* Debug */ = {{")
W("\t\t\tisa = XCBuildConfiguration;")
W("\t\t\tbuildSettings = {")
W(f"\t\t\t\tBUNDLE_IDENTIFIER = \"{BUNDLE_ID}.debug\";")
W("\t\t\t\tCODE_SIGN_STYLE = Automatic;")
W("\t\t\t\tCURRENT_PROJECT_VERSION = 1;")
W("\t\t\t\tDEVELOPMENT_ASSET_PATHS = \"\";")
W("\t\t\t\tENABLE_PREVIEWS = YES;")
W("\t\t\t\tGENERATE_INFOPLIST_FILE = NO;")
W("\t\t\t\tINFOPLIST_FILE = ColisDirectApp/Info.plist;")
W("\t\t\t\tIPHONEOS_DEPLOYMENT_TARGET = 17.0;")
W("\t\t\t\tLE_SWIFT_VERSION = 5.0;")
W("\t\t\t\tMARKETING_VERSION = 1.0;")
W("\t\t\t\tPRODUCT_BUNDLE_IDENTIFIER = \"{BUNDLE_ID}.debug\";")
W("\t\t\t\tPRODUCT_NAME = \"$(TARGET_NAME)\";")
W("\t\t\t\tSWIFT_EMIT_LOC_STRINGS = YES;")
W("\t\t\t\tSWIFT_STRICT_CONCURRENCY = complete;")
W("\t\t\t\tSWIFT_VERSION = 6.0;")
W("\t\t\t\tTARGETED_DEVICE_FAMILY = \"1,2\";")
W("\t\t\t};")
W("\t\t\tname = Debug;")
W("\t\t};")

# Target Release config
W(f"\t\t{release_target_config_uuid} /* Release */ = {{")
W("\t\t\tisa = XCBuildConfiguration;")
W("\t\t\tbuildSettings = {")
W(f"\t\t\t\tBUNDLE_IDENTIFIER = \"{BUNDLE_ID}\";")
W("\t\t\t\tCODE_SIGN_STYLE = Automatic;")
W("\t\t\t\tCURRENT_PROJECT_VERSION = 1;")
W("\t\t\t\tDEVELOPMENT_ASSET_PATHS = \"\";")
W("\t\t\t\tENABLE_PREVIEWS = YES;")
W("\t\t\t\tGENERATE_INFOPLIST_FILE = NO;")
W("\t\t\t\tINFOPLIST_FILE = ColisDirectApp/Info.plist;")
W("\t\t\t\tIPHONEOS_DEPLOYMENT_TARGET = 17.0;")
W(f"\t\t\t\tMARKETING_VERSION = 1.0;")
W(f"\t\t\t\tPRODUCT_BUNDLE_IDENTIFIER = \"{BUNDLE_ID}\";")
W("\t\t\t\tPRODUCT_NAME = \"$(TARGET_NAME)\";")
W("\t\t\t\tSWIFT_EMIT_LOC_STRINGS = YES;")
W("\t\t\t\tSWIFT_STRICT_CONCURRENCY = complete;")
W("\t\t\t\tSWIFT_VERSION = 6.0;")
W("\t\t\t\tTARGETED_DEVICE_FAMILY = \"1,2\";")
W("\t\t\t};")
W("\t\t\tname = Release;")
W("\t\t};")

W("/* End XCBuildConfiguration section */")
W()

# ── XCConfigurationList ──
W("/* Begin XCConfigurationList section */")
W(f"\t\t{build_config_list_proj} /* Build configuration list for PBXProject \"ColisDirectApp\" */ = {{")
W("\t\t\tisa = XCConfigurationList;")
W("\t\t\tbuildConfigurations = (")
W(f"\t\t\t\t{debug_config_uuid} /* Debug */,")
W(f"\t\t\t\t{release_config_uuid} /* Release */,")
W("\t\t\t);")
W("\t\t\tdefaultConfigurationIsVisible = 0;")
W("\t\t\tdefaultConfigurationName = Release;")
W("\t\t};")
W(f"\t\t{build_config_list_target} /* Build configuration list for PBXNativeTarget \"ColisDirectApp\" */ = {{")
W("\t\t\tisa = XCConfigurationList;")
W("\t\t\tbuildConfigurations = (")
W(f"\t\t\t\t{debug_target_config_uuid} /* Debug */,")
W(f"\t\t\t\t{release_target_config_uuid} /* Release */,")
W("\t\t\t);")
W("\t\t\tdefaultConfigurationIsVisible = 0;")
W("\t\t\tdefaultConfigurationName = Release;")
W("\t\t};")
W("/* End XCConfigurationList section */")
W()

W("\t};")
W(f"\trootObject = {proj_uuid} /* Project object */;")
W("}")

# ──────────────────────────────────────────────────────────────
# Write the .xcodeproj
# ──────────────────────────────────────────────────────────────
xcodeproj_dir = os.path.join(os.path.dirname(__file__), "ColisDirectApp.xcodeproj")
os.makedirs(xcodeproj_dir, exist_ok=True)

pbxproj_path = os.path.join(xcodeproj_dir, "project.pbxproj")
with open(pbxproj_path, "w", encoding="utf-8") as f:
    f.write("\n".join(lines))

print(f"\n✅ Generated: {pbxproj_path}")
print(f"   {len(swift_files)} Swift files registered")
print(f"\n👉 Open ColisDirectApp.xcodeproj in Xcode to build and run!")
