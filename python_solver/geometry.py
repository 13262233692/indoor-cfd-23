import numpy as np
import json
import sys


def point_in_polygon(px, py, polygon):
    n = len(polygon)
    inside = False
    j = n - 1
    for i in range(n):
        xi, yi = polygon[i]
        xj, yj = polygon[j]
        if ((yi > py) != (yj > py)) and (px < (xj - xi) * (py - yi) / (yj - yi) + xi):
            inside = not inside
        j = i
    return inside


def polygon_signed_area(polygon):
    n = len(polygon)
    area = 0.0
    for i in range(n):
        j = (i + 1) % n
        area += polygon[i][0] * polygon[j][1]
        area -= polygon[j][0] * polygon[i][1]
    return area / 2.0


def ensure_ccw(polygon):
    if polygon_signed_area(polygon) < 0:
        polygon = polygon[::-1]
    return polygon


def distance_point_to_segment(px, py, x1, y1, x2, y2):
    dx = x2 - x1
    dy = y2 - y1
    len_sq = dx * dx + dy * dy
    if len_sq == 0:
        return np.sqrt((px - x1) ** 2 + (py - y1) ** 2)
    t = max(0, min(1, ((px - x1) * dx + (py - y1) * dy) / len_sq))
    proj_x = x1 + t * dx
    proj_y = y1 + t * dy
    return np.sqrt((px - proj_x) ** 2 + (py - proj_y) ** 2)


def find_nearest_edge(px, py, polygon):
    min_dist = float('inf')
    nearest_edge = 0
    nearest_t = 0.0
    n = len(polygon)
    for i in range(n):
        x1, y1 = polygon[i]
        x2, y2 = polygon[(i + 1) % n]
        dx = x2 - x1
        dy = y2 - y1
        len_sq = dx * dx + dy * dy
        if len_sq == 0:
            continue
        t = max(0, min(1, ((px - x1) * dx + (py - y1) * dy) / len_sq))
        proj_x = x1 + t * dx
        proj_y = y1 + t * dy
        dist = np.sqrt((px - proj_x) ** 2 + (py - proj_y) ** 2)
        if dist < min_dist:
            min_dist = dist
            nearest_edge = i
            nearest_t = t
    return nearest_edge, nearest_t, min_dist


def build_mesh(geometry_data):
    room = geometry_data['room']
    vents = geometry_data.get('vents', [])
    grid_size = geometry_data.get('gridSize', 50)

    polygon_points = room['points']
    if len(polygon_points) < 3:
        raise ValueError(f"房间至少需要3个顶点，当前只有{len(polygon_points)}个")

    phys_width = room.get('width', 10.0)
    phys_height = room.get('height', 10.0)

    canvas_xs = [p['x'] for p in polygon_points]
    canvas_ys = [p['y'] for p in polygon_points]
    min_cx, max_cx = min(canvas_xs), max(canvas_xs)
    min_cy, max_cy = min(canvas_ys), max(canvas_ys)
    canvas_w = max_cx - min_cx if max_cx > min_cx else 1.0
    canvas_h = max_cy - min_cy if max_cy > min_cy else 1.0

    polygon_phys = []
    for p in polygon_points:
        px = (p['x'] - min_cx) / canvas_w * phys_width
        py = (1.0 - (p['y'] - min_cy) / canvas_h) * phys_height
        polygon_phys.append((px, py))

    polygon_phys = ensure_ccw(polygon_phys)

    dx = phys_width / grid_size
    nx = grid_size + 1
    ny = int(phys_height / dx) + 1
    dy = phys_height / (ny - 1)

    x = np.linspace(0, phys_width, nx)
    y = np.linspace(0, phys_height, ny)

    fluid = np.zeros((ny, nx), dtype=bool)
    for j in range(ny):
        for i in range(nx):
            if point_in_polygon(x[i], y[j], polygon_phys):
                fluid[j, i] = True

    if not np.any(fluid):
        raise ValueError("网格生成失败：没有任何网格点落在房间多边形内部。请检查房间形状是否正确。")

    bnd = np.zeros((ny, nx), dtype=int)
    for j in range(ny):
        for i in range(nx):
            if not fluid[j, i]:
                continue
            for dj, di in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                nj, ni = j + dj, i + di
                if nj < 0 or nj >= ny or ni < 0 or ni >= nx or not fluid[nj, ni]:
                    bnd[j, i] = 1
                    break

    inlet_mask = np.zeros((ny, nx), dtype=bool)
    outlet_mask = np.zeros((ny, nx), dtype=bool)

    for vent in vents:
        pos = vent['position']
        vpx = (pos['x'] - min_cx) / canvas_w * phys_width
        vpy = (1.0 - (pos['y'] - min_cy) / canvas_h) * phys_height
        vw = vent.get('width', 0.5)

        is_inlet = vent['type'] == 'supply'
        mask = inlet_mask if is_inlet else outlet_mask

        search_radius = max(vw, dx * 2.0)

        edge_idx, edge_t, edge_dist = find_nearest_edge(vpx, vpy, polygon_phys)

        ex1, ey1 = polygon_phys[edge_idx]
        ex2, ey2 = polygon_phys[(edge_idx + 1) % len(polygon_phys)]
        edge_len = np.sqrt((ex2 - ex1) ** 2 + (ey2 - ey1) ** 2)

        matched_count = 0
        for j in range(ny):
            for i in range(nx):
                if bnd[j, i] != 1 or not fluid[j, i]:
                    continue

                dist_to_vent = np.sqrt((x[i] - vpx) ** 2 + (y[j] - vpy) ** 2)
                if dist_to_vent > search_radius:
                    continue

                pt_edge, pt_t, pt_dist = find_nearest_edge(x[i], y[j], polygon_phys)
                if pt_edge == edge_idx:
                    t_on_edge = pt_t
                    if edge_len > 0:
                        t_vent_on_edge = ((vpx - ex1) * (ex2 - ex1) + (vpy - ey1) * (ey2 - ey1)) / (edge_len * edge_len)
                    else:
                        t_vent_on_edge = 0.5
                    t_vent_on_edge = max(0, min(1, t_vent_on_edge))

                    if abs(t_on_edge - t_vent_on_edge) * edge_len < vw * 1.5 + dx:
                        mask[j, i] = True
                        matched_count += 1

        if matched_count == 0:
            for j in range(ny):
                for i in range(nx):
                    if bnd[j, i] != 1 or not fluid[j, i]:
                        continue
                    dist = np.sqrt((x[i] - vpx) ** 2 + (y[j] - vpy) ** 2)
                    if dist < vw + dx * 3:
                        mask[j, i] = True
                        matched_count += 1

            if matched_count == 0:
                for j in range(ny):
                    for i in range(nx):
                        if bnd[j, i] != 1 or not fluid[j, i]:
                            continue
                        dist = np.sqrt((x[i] - vpx) ** 2 + (y[j] - vpy) ** 2)
                        if dist < search_radius * 2:
                            mask[j, i] = True
                            matched_count += 1
                            if matched_count >= 3:
                                break
                    if matched_count >= 3:
                        break

    if not np.any(inlet_mask):
        raise ValueError(
            "送风口未匹配到任何边界网格点。请检查送风口是否放置在房间边界上，"
            "或尝试增大风口宽度。非凸多边形房间中，风口需放置在多边形的边上。"
        )

    if not np.any(outlet_mask):
        raise ValueError(
            "回风口未匹配到任何边界网格点。请检查回风口是否放置在房间边界上，"
            "或尝试增大风口宽度。非凸多边形房间中，风口需放置在多边形的边上。"
        )

    return {
        'nx': nx,
        'ny': ny,
        'dx': dx,
        'dy': dy,
        'x': x,
        'y': y,
        'fluid': fluid,
        'bnd': bnd,
        'inlet_mask': inlet_mask,
        'outlet_mask': outlet_mask,
        'phys_width': phys_width,
        'phys_height': phys_height,
        'polygon_phys': polygon_phys,
    }
