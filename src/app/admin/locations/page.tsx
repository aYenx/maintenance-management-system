"use client";
import DataTable from "@/components/admin/DataTable";
import { Button } from "@/components/ui/button";
import { Location } from "@prisma/client";
import { ColumnDef } from "@tanstack/react-table";
import { Check, Locate, Trash2 } from "lucide-react";
import mapPin from "@/assets/map-pin.png";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import "@amap/amap-jsapi-types";
import AMapLoader from "@heycar/amap-jsapi-loader";
import { useEffect, useRef, useState } from "react";
import { Spinner } from "@/components/Spinner";
let map: AMap.Map;
import "./style.css";
import { toast } from "react-hot-toast";
// exclude id
type loc = Omit<Location, "id">;
export default function page() {
  const [refresh, setRefresh] = useState(false);

  const columns: ColumnDef<Location>[] = [
    { accessorKey: "id", header: "ID" },
    { accessorKey: "name", header: "地点" },
    {
      accessorFn: (row) => `${row.latitude} , ${row.longitude}`,
      header: "地址(经纬度)",
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => {
        return (
          <button
            onClick={() => {
              toast.promise(
                fetch(`/api/locations/${row.original.id}`, {
                  method: "DELETE",
                }).then(() => {
                  setRefresh((refresh) => !refresh);
                }),
                {
                  loading: "删除中...",
                  success: "删除成功",
                  error: "删除失败",
                },
              );
            }}
          >
            <Trash2
              size={16}
              className="scale-110 cursor-pointer hover:text-red-500 "
            />
          </button>
        );
      },
    },
  ];

  const mapRef = useRef<HTMLDivElement>(null);
  const [isOpened, setIsOpened] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [locations, setLocations] = useState<loc[]>([]);
  const [lngLat, setLngLat] = useState<[number, number]>();

  function loadMap() {
    const amapKey = process.env.NEXT_PUBLIC_AMAP_KEY ?? "";
  
  if (!amapKey) {
    console.error('高德地图API密钥未配置');
    toast.error('地图功能不可用，请联系管理员配置API密钥');
    return;
  }
    AMapLoader.load({
      // key: process.env.NEXT_PUBLIC_AMAP_KEY,
      key: amapKey,
      version: "2.0",
    })
      .then((AMap) => {
        map = new AMap.Map(mapRef.current);
        map.setMapStyle("amap://styles/520502358523cd64bd082a98087e4c10");
        map.setCenter([108.292, 22.847634]);
        map.setZoom(15);

        // 加载markers
        fetch("/api/locations")
          .then((res) => res.json())
          .then((res) => {
            res.data.forEach((loc: loc) => {
              let marker = new window.AMap.Marker({
                position: [loc.longitude, loc.latitude],
                map: map,
                title: loc.name,
                icon: mapPin.src,
              });
              marker.setLabel({
                offset: new window.AMap.Pixel(5, 0),
                direction: "right",
                content: `<div class="text-center  bg-white border rounded-md shadow-xl px-5 py-1">
                ${loc.name}</div>`,
              });
            });
          });

        map.on("mousemove", function (e: any) {
          setLngLat([e.lnglat.lng, e.lnglat.lat]);
        });
        map.on("click", function (e: any) {
          let name = prompt("请输入地点名称");
          if (!name) return;
          setLocations((locations) => [
            ...locations,
            {
              latitude: e.lnglat.lat,
              longitude: e.lnglat.lng,
              name: name || "未命名",
            },
          ]);
          let marker = new window.AMap.Marker({
            position: e.lnglat,
            map: map,
            title: name,
            icon: mapPin.src,
          });
          marker.setLabel({
            offset: new window.AMap.Pixel(5, 0),
            direction: "right",
            content: `<div class="text-center  bg-white border rounded-md shadow-xl px-5 py-1">
          ${name}</div>`,
          });
        });
      })
      .finally(() => {
        setMapLoaded(true);
      });
  }

  useEffect(() => {
    if (isOpened) {
      loadMap();
    } else {
      map && map.destroy();
      setLocations([]);
      setMapLoaded(false);
      console.log("destroy");
    }
  }, [isOpened]);
  return (
    <div>
      <DataTable url="/api/locations" columns={columns} mutateFlag={refresh}>
        <Dialog onOpenChange={setIsOpened} open={isOpened}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-1 pl-2 pr-2.5">
              <Locate size={18} />
              新建地点
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新建地点</DialogTitle>
              <DialogDescription>
                鼠标点击地图某地点拾取位置新建,
                {lngLat && `当前位置: ${lngLat[0]},${lngLat[1]}`}
              </DialogDescription>
            </DialogHeader>
            <div ref={mapRef} className="h-[460px] w-full">
              {!mapLoaded && (
                <div className="flex h-full w-full items-center justify-center">
                  <Spinner />
                </div>
              )}
            </div>
            <div className="flex w-full items-center justify-between">
              <div className="text-muted-foreground   ">
                已标记:{locations.length}
              </div>
              <Button
                className="flex gap-x-1 "
                onClick={() => {
                  if (locations.length === 0) {
                    toast.error("请先标记地点");
                    return;
                  }
                  fetch("/api/locations", {
                    method: "POST",
                    body: JSON.stringify(locations),
                  })
                    .then((res) => res.json())
                    .then((res) => {
                      if (res) {
                        toast.success("创建成功");
                        setIsOpened(false);
                        setLocations([]);
                        setRefresh((refresh) => !refresh);
                      } else {
                        toast.error("创建失败");
                      }
                    });
                }}
              >
                <Check width={18} />
                保存
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </DataTable>
    </div>
  );
}
