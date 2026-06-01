import numpy as np
import json
import sys


D2Q9_W = np.array([4/9, 1/9, 1/9, 1/9, 1/9, 1/36, 1/36, 1/36, 1/36])
D2Q9_CX = np.array([0, 1, 0, -1, 0, 1, -1, -1, 1])
D2Q9_CY = np.array([0, 0, 1, 0, -1, 1, 1, -1, -1])
D2Q9_OPP = np.array([0, 3, 4, 1, 2, 7, 8, 5, 6])


def equilibrium(rho, ux, uy):
    feq = np.zeros((9, rho.shape[0], rho.shape[1]))
    usq = ux * ux + uy * uy
    for i in range(9):
        cu = D2Q9_CX[i] * ux + D2Q9_CY[i] * uy
        feq[i] = D2Q9_W[i] * rho * (1.0 + 3.0 * cu + 4.5 * cu * cu - 1.5 * usq)
    return feq


def solve(mesh, params, progress_callback=None):
    nx = mesh['nx']
    ny = mesh['ny']
    dx = mesh['dx']
    fluid = mesh['fluid']
    bnd = mesh['bnd']
    inlet_mask = mesh['inlet_mask']
    outlet_mask = mesh['outlet_mask']

    u_inlet = params.get('inletVelocity', 1.0)
    nu = params.get('kinematicViscosity', 0.01)
    time_steps = params.get('timeSteps', 500)
    relax = params.get('relaxFactor', 1.5)
    with_conc = params.get('withConcentration', False)

    tau = relax
    omega = 1.0 / tau

    u_lb = u_inlet * dx
    if nu > 0:
        req_tau = 3.0 * nu / (dx) + 0.5
        if abs(tau - req_tau) > 0.5:
            tau = max(req_tau, 0.51)
            omega = 1.0 / tau

    rho = np.ones((ny, nx))
    ux = np.zeros((ny, nx))
    uy = np.zeros((ny, nx))
    f = equilibrium(rho, ux, uy)

    conc = np.zeros((ny, nx)) if with_conc else None
    if with_conc:
        g = np.zeros((9, ny, nx))
        g[:, :, :] = conc / 9.0

    for step in range(time_steps):
        f_eq = equilibrium(rho, ux, uy)
        f_out = f - omega * (f - f_eq)

        f_new = np.zeros_like(f)
        for i in range(9):
            f_new[i] = np.roll(np.roll(f_out[i], D2Q9_CX[i], axis=1), D2Q9_CY[i], axis=0)

        for i in range(9):
            opp = D2Q9_OPP[i]
            bounce = bnd == 1
            no_inlet = ~inlet_mask
            no_outlet = ~outlet_mask
            wall_mask = bounce & no_inlet & no_outlet & fluid
            f_new[i][wall_mask] = f_out[opp][wall_mask]

        rho_inlet = 1.0
        ux_inlet = u_lb
        for i in range(9):
            cu = D2Q9_CX[i] * ux_inlet
            feq_inlet = D2Q9_W[i] * rho_inlet * (1.0 + 3.0 * cu + 4.5 * cu * cu - 1.5 * ux_inlet ** 2)
            f_new[i][inlet_mask] = feq_inlet

        rho = np.sum(f_new, axis=0)
        rho[rho < 1e-10] = 1e-10
        ux = np.sum(f_new * D2Q9_CX.reshape(9, 1, 1), axis=0) / rho
        uy = np.sum(f_new * D2Q9_CY.reshape(9, 1, 1), axis=0) / rho

        ux[~fluid] = 0
        uy[~fluid] = 0

        if with_conc and conc is not None:
            g_eq = np.zeros((9, ny, nx))
            for i in range(9):
                cu = D2Q9_CX[i] * ux + D2Q9_CY[i] * uy
                g_eq[i] = D2Q9_W[i] * conc * (1.0 + 3.0 * cu)
            g_out = g - omega * (g - g_eq)
            g_new = np.zeros_like(g)
            for i in range(9):
                g_new[i] = np.roll(np.roll(g_out[i], D2Q9_CX[i], axis=1), D2Q9_CY[i], axis=0)
            for i in range(9):
                opp = D2Q9_OPP[i]
                wall_mask = (bnd == 1) & ~inlet_mask & ~outlet_mask & fluid
                g_new[i][wall_mask] = g_out[opp][wall_mask]
            for i in range(9):
                g_new[i][inlet_mask] = D2Q9_W[i] * 1.0
            conc = np.sum(g_new, axis=0)
            conc[~fluid] = 0
            conc = np.clip(conc, 0, None)
            g = g_new

        f = f_new

        if progress_callback and (step % max(1, time_steps // 20) == 0 or step == time_steps - 1):
            progress = (step + 1) / time_steps
            progress_callback(progress)

    ux_phys = ux / dx
    uy_phys = uy / dx
    vel_mag = np.sqrt(ux_phys ** 2 + uy_phys ** 2)
    vel_mag[~fluid] = 0

    pressure = rho / 3.0

    result = {
        'nx': int(nx),
        'ny': int(ny),
        'dx': float(dx),
        'x': mesh['x'].tolist(),
        'y': mesh['y'].tolist(),
        'u': ux_phys.tolist(),
        'v': uy_phys.tolist(),
        'velocity': vel_mag.tolist(),
        'pressure': pressure.tolist(),
    }

    if with_conc and conc is not None:
        conc_norm = conc.copy()
        conc_norm[~fluid] = 0
        result['concentration'] = conc_norm.tolist()

    return result
