import {
  AdminActionType,
  DeviceAttestationStatus,
  DeviceBindingStatus,
  DeviceBindingType,
  DevicePlatform,
  type PrismaClient,
  SecurityEventSeverity,
  SecurityEventType,
} from "@prisma/client"

import { buildAdminActionLogData, buildSecurityEventData } from "./audit.js"
import type { PrismaTransactionClient } from "./client"
import { developmentAuthFixtures, developmentLifecycleFixtures } from "./fixtures"
import { developmentSeedIds } from "./seed.ids"
import type {
  SeedAcademicContext,
  SeedDeviceContext,
  SeedTimingContext,
  SeedUsersContext,
} from "./seed.internal"

type SeedDeviceTransaction = Pick<
  PrismaClient,
  "device" | "userDeviceBinding" | "securityEvent" | "adminActionLog"
> &
  Pick<PrismaTransactionClient, "device" | "userDeviceBinding" | "securityEvent" | "adminActionLog">

export async function seedDeviceTrustData(
  transaction: SeedDeviceTransaction,
  timing: SeedTimingContext,
  users: SeedUsersContext,
  academic: SeedAcademicContext,
): Promise<SeedDeviceContext> {
  const studentFixtures = developmentAuthFixtures.students
  const studentTwoReplacementFixture =
    developmentLifecycleFixtures.deviceTrust.replacementHistory.studentTwo

  const [studentOneDevice, studentTwoDevice, studentTwoRevokedDevice] = await Promise.all([
    transaction.device.upsert({
      where: { installId: studentFixtures.studentOne.device.installId },
      update: {
        platform: DevicePlatform[studentFixtures.studentOne.device.platform],
        publicKey: studentFixtures.studentOne.device.publicKey,
        appVersion: studentFixtures.studentOne.device.appVersion,
        deviceModel: studentFixtures.studentOne.device.deviceModel,
        osVersion: studentFixtures.studentOne.device.osVersion,
        attestationStatus: DeviceAttestationStatus.PASSED,
        lastSeenAt: timing.now,
      },
      create: {
        id: developmentSeedIds.devices.studentOne,
        installId: studentFixtures.studentOne.device.installId,
        platform: DevicePlatform[studentFixtures.studentOne.device.platform],
        publicKey: studentFixtures.studentOne.device.publicKey,
        appVersion: studentFixtures.studentOne.device.appVersion,
        deviceModel: studentFixtures.studentOne.device.deviceModel,
        osVersion: studentFixtures.studentOne.device.osVersion,
        attestationStatus: DeviceAttestationStatus.PASSED,
        lastSeenAt: timing.now,
      },
    }),
    transaction.device.upsert({
      where: { installId: studentFixtures.studentTwo.device.installId },
      update: {
        platform: DevicePlatform[studentFixtures.studentTwo.device.platform],
        publicKey: studentFixtures.studentTwo.device.publicKey,
        appVersion: studentFixtures.studentTwo.device.appVersion,
        deviceModel: studentFixtures.studentTwo.device.deviceModel,
        osVersion: studentFixtures.studentTwo.device.osVersion,
        attestationStatus: DeviceAttestationStatus.PASSED,
        lastSeenAt: timing.now,
      },
      create: {
        id: developmentSeedIds.devices.studentTwo,
        installId: studentFixtures.studentTwo.device.installId,
        platform: DevicePlatform[studentFixtures.studentTwo.device.platform],
        publicKey: studentFixtures.studentTwo.device.publicKey,
        appVersion: studentFixtures.studentTwo.device.appVersion,
        deviceModel: studentFixtures.studentTwo.device.deviceModel,
        osVersion: studentFixtures.studentTwo.device.osVersion,
        attestationStatus: DeviceAttestationStatus.PASSED,
        lastSeenAt: timing.now,
      },
    }),
    transaction.device.upsert({
      where: { installId: studentTwoReplacementFixture.revokedDevice.installId },
      update: {
        platform: DevicePlatform[studentTwoReplacementFixture.revokedDevice.platform],
        publicKey: studentTwoReplacementFixture.revokedDevice.publicKey,
        appVersion: studentTwoReplacementFixture.revokedDevice.appVersion,
        deviceModel: studentTwoReplacementFixture.revokedDevice.deviceModel,
        osVersion: studentTwoReplacementFixture.revokedDevice.osVersion,
        attestationStatus: DeviceAttestationStatus.PASSED,
        lastSeenAt: timing.now,
      },
      create: {
        id: developmentSeedIds.devices.studentTwoRevoked,
        installId: studentTwoReplacementFixture.revokedDevice.installId,
        platform: DevicePlatform[studentTwoReplacementFixture.revokedDevice.platform],
        publicKey: studentTwoReplacementFixture.revokedDevice.publicKey,
        appVersion: studentTwoReplacementFixture.revokedDevice.appVersion,
        deviceModel: studentTwoReplacementFixture.revokedDevice.deviceModel,
        osVersion: studentTwoReplacementFixture.revokedDevice.osVersion,
        attestationStatus: DeviceAttestationStatus.PASSED,
        lastSeenAt: timing.studentTwoRevokedAt,
      },
    }),
  ])

  await transaction.userDeviceBinding.updateMany({
    where: {
      bindingType: DeviceBindingType.STUDENT_ATTENDANCE,
      status: DeviceBindingStatus.ACTIVE,
      NOT: {
        id: {
          in: [developmentSeedIds.bindings.studentOne, developmentSeedIds.bindings.studentTwo],
        },
      },
      OR: [
        { userId: developmentSeedIds.users.studentOne },
        { userId: developmentSeedIds.users.studentTwo },
        { deviceId: studentOneDevice.id },
        { deviceId: studentTwoDevice.id },
        { deviceId: studentTwoRevokedDevice.id },
      ],
    },
    data: {
      status: DeviceBindingStatus.REVOKED,
      revokedAt: timing.now,
      revokedByUserId: users.adminUser.id,
      revokeReason: "Superseded by development seed data",
    },
  })

  const [studentOneBinding, studentTwoBinding, studentTwoRevokedBinding] = await Promise.all([
    transaction.userDeviceBinding.upsert({
      where: { id: developmentSeedIds.bindings.studentOne },
      update: {
        userId: developmentSeedIds.users.studentOne,
        deviceId: studentOneDevice.id,
        bindingType: DeviceBindingType.STUDENT_ATTENDANCE,
        status: DeviceBindingStatus.ACTIVE,
        activatedAt: timing.now,
        revokedAt: null,
        revokedByUserId: null,
        revokeReason: null,
      },
      create: {
        id: developmentSeedIds.bindings.studentOne,
        userId: developmentSeedIds.users.studentOne,
        deviceId: studentOneDevice.id,
        bindingType: DeviceBindingType.STUDENT_ATTENDANCE,
        status: DeviceBindingStatus.ACTIVE,
        activatedAt: timing.now,
      },
    }),
    transaction.userDeviceBinding.upsert({
      where: { id: developmentSeedIds.bindings.studentTwo },
      update: {
        userId: developmentSeedIds.users.studentTwo,
        deviceId: studentTwoDevice.id,
        bindingType: DeviceBindingType.STUDENT_ATTENDANCE,
        status: DeviceBindingStatus.ACTIVE,
        activatedAt: timing.now,
        revokedAt: null,
        revokedByUserId: null,
        revokeReason: null,
      },
      create: {
        id: developmentSeedIds.bindings.studentTwo,
        userId: developmentSeedIds.users.studentTwo,
        deviceId: studentTwoDevice.id,
        bindingType: DeviceBindingType.STUDENT_ATTENDANCE,
        status: DeviceBindingStatus.ACTIVE,
        activatedAt: timing.now,
      },
    }),
    transaction.userDeviceBinding.upsert({
      where: { id: developmentSeedIds.bindings.studentTwoRevoked },
      update: {
        userId: developmentSeedIds.users.studentTwo,
        deviceId: studentTwoRevokedDevice.id,
        bindingType: DeviceBindingType.STUDENT_ATTENDANCE,
        status: DeviceBindingStatus.REVOKED,
        activatedAt: new Date("2026-03-01T09:00:00.000Z"),
        revokedAt: timing.studentTwoRevokedAt,
        revokedByUserId: users.adminUser.id,
        revokeReason: studentTwoReplacementFixture.revokedReason,
      },
      create: {
        id: developmentSeedIds.bindings.studentTwoRevoked,
        userId: developmentSeedIds.users.studentTwo,
        deviceId: studentTwoRevokedDevice.id,
        bindingType: DeviceBindingType.STUDENT_ATTENDANCE,
        status: DeviceBindingStatus.REVOKED,
        activatedAt: new Date("2026-03-01T09:00:00.000Z"),
        revokedAt: timing.studentTwoRevokedAt,
        revokedByUserId: users.adminUser.id,
        revokeReason: studentTwoReplacementFixture.revokedReason,
      },
    }),
  ])

  await transaction.securityEvent.deleteMany({
    where: {
      id: {
        in: Object.values(developmentSeedIds.securityEvents),
      },
    },
  })

  await transaction.adminActionLog.deleteMany({
    where: {
      id: {
        in: Object.values(developmentSeedIds.adminActions),
      },
    },
  })

  await transaction.securityEvent.createMany({
    data: [
      buildSecurityEventData({
        id: developmentSeedIds.securityEvents.studentOneBound,
        userId: developmentSeedIds.users.studentOne,
        actorUserId: users.adminUser.id,
        deviceId: studentOneDevice.id,
        bindingId: studentOneBinding.id,
        courseOfferingId: academic.mathCourseOfferingId,
        eventType: SecurityEventType.DEVICE_BOUND,
        severity: SecurityEventSeverity.LOW,
        description: "Seeded trusted device binding for student one",
        metadata: {
          bindingId: studentOneBinding.id,
        },
        createdAt: timing.now,
      }),
      buildSecurityEventData({
        id: developmentSeedIds.securityEvents.studentTwoBound,
        userId: developmentSeedIds.users.studentTwo,
        actorUserId: users.adminUser.id,
        deviceId: studentTwoDevice.id,
        bindingId: studentTwoBinding.id,
        courseOfferingId: academic.mathCourseOfferingId,
        eventType: SecurityEventType.DEVICE_BOUND,
        severity: SecurityEventSeverity.LOW,
        description: "Seeded trusted device binding for student two",
        metadata: {
          bindingId: studentTwoBinding.id,
        },
        createdAt: timing.now,
      }),
      buildSecurityEventData({
        id: developmentSeedIds.securityEvents.studentTwoRevoked,
        userId: developmentSeedIds.users.studentTwo,
        actorUserId: users.adminUser.id,
        deviceId: studentTwoRevokedDevice.id,
        bindingId: studentTwoRevokedBinding.id,
        courseOfferingId: academic.physicsCourseOfferingId,
        eventType: SecurityEventType.DEVICE_REVOKED,
        severity: SecurityEventSeverity.MEDIUM,
        description: studentTwoReplacementFixture.revokedReason,
        metadata: {
          replacementBindingId: studentTwoBinding.id,
        },
        createdAt: timing.studentTwoRevokedAt,
      }),
    ],
  })

  await transaction.adminActionLog.createMany({
    data: [
      buildAdminActionLogData({
        id: developmentSeedIds.adminActions.studentOneApprove,
        adminUserId: users.adminUser.id,
        targetUserId: developmentSeedIds.users.studentOne,
        targetDeviceId: studentOneDevice.id,
        targetBindingId: studentOneBinding.id,
        targetCourseOfferingId: academic.mathCourseOfferingId,
        actionType: AdminActionType.DEVICE_APPROVE_REPLACEMENT,
        metadata: {
          reason: "Initial development seed approval",
        },
        createdAt: timing.now,
      }),
      buildAdminActionLogData({
        id: developmentSeedIds.adminActions.studentTwoRevoke,
        adminUserId: users.adminUser.id,
        targetUserId: developmentSeedIds.users.studentTwo,
        targetDeviceId: studentTwoRevokedDevice.id,
        targetBindingId: studentTwoRevokedBinding.id,
        targetCourseOfferingId: academic.physicsCourseOfferingId,
        actionType: AdminActionType.DEVICE_REVOKE,
        metadata: {
          reason: studentTwoReplacementFixture.revokedReason,
        },
        createdAt: timing.studentTwoRevokedAt,
      }),
      buildAdminActionLogData({
        id: developmentSeedIds.adminActions.studentTwoApproveReplacement,
        adminUserId: users.adminUser.id,
        targetUserId: developmentSeedIds.users.studentTwo,
        targetDeviceId: studentTwoDevice.id,
        targetBindingId: studentTwoBinding.id,
        targetCourseOfferingId: academic.physicsCourseOfferingId,
        actionType: AdminActionType.DEVICE_APPROVE_REPLACEMENT,
        metadata: {
          reason: studentTwoReplacementFixture.approvalReason,
        },
        createdAt: timing.now,
      }),
    ],
  })

  return {
    studentOneDeviceId: studentOneDevice.id,
    studentTwoDeviceId: studentTwoDevice.id,
    studentTwoRevokedDeviceId: studentTwoRevokedDevice.id,
    studentOneBindingId: studentOneBinding.id,
    studentTwoBindingId: studentTwoBinding.id,
    studentTwoRevokedBindingId: studentTwoRevokedBinding.id,
  }
}
