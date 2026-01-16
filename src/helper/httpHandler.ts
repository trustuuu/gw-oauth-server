import { Request, Response } from "express";
import applicationService from "../service/application-service.js"; // Importing JS file for now

export function httpRun(
  response: Response,
  fn: () => Promise<any>,
  success?: (result: any) => any,
  errorCallback?: (err: any) => any,
  data?: any
) {
  return fn()
    .then((result) =>
      response
        .status(200)
        .send(data ? data : success ? success(result) : result)
    )
    .catch((err) => {
      console.error(err);
      return response
        .status(500)
        .send(errorCallback ? errorCallback(err) : err);
    });
}

export function createPostHandler(
  serviceFn: any,
  serviceArgsFn: (req: Request) => any[],
  options: { generateIdFn?: (item: any) => string } = {}
) {
  const { generateIdFn } = options;

  return (req: Request, res: Response) => {
    const payload = req.body;

    const makeRecord = (item: any) => {
      const finalId = generateIdFn ? generateIdFn(item) : item.id;

      return {
        ...item,
        id: finalId,
        whenCreated: new Date(),
        status: "New",
      };
    };

    const saveOne = (record: any) => {
      return serviceFn.setData.apply(
        serviceFn,
        [record].concat([...serviceArgsFn(req), record.id]) //[appPath, parentId, resourceName, record.id])
      );
    };

    // ----- ARRAY: save all at once -----
    if (Array.isArray(payload)) {
      const list = payload.map(makeRecord);
      const tasks = list.map(saveOne);
      return httpRun(res, () => Promise.all(tasks));
    }

    // ----- SINGLE OBJECT -----
    const record = makeRecord(payload);
    return httpRun(res, () => saveOne(record), undefined, undefined, record);
  };
}

//==========================================================
// has not used from below
//==========================================================

export function httpGetHandler(
  serviceFn: any,
  serviceArgsFn: (req: Request) => any[]
) {
  return (req: Request, res: Response) => {
    httpRun(res, () => serviceFn.apply(applicationService, serviceArgsFn(req)));
  };
}

export function httpPostHandler(
  serviceFn: any,
  buildDataFn: (item: any) => any,
  serviceArgsFn: (req: Request) => any[]
) {
  return (req: Request, res: Response) => {
    const body = req.body;

    if (Array.isArray(body)) {
      const ops = body.map((item: any) => {
        const data = buildDataFn(item);
        return serviceFn.apply(applicationService, [
          data,
          ...serviceArgsFn(req),
          data.id,
        ]);
      });

      return httpRun(res, () => Promise.all(ops));
    }

    const data = buildDataFn(body);

    return httpRun(
      res,
      () =>
        serviceFn.apply(applicationService, [
          data,
          ...serviceArgsFn(req),
          data.id,
        ]),
      null,
      null,
      data
    );
  };
}

export function httpPutHandler(
  serviceFn: any,
  serviceArgsFn: (req: Request) => any[]
) {
  return (req: Request, res: Response) => {
    const data = { ...req.body, whenUpdated: new Date(), status: "Updated" };

    return httpRun(
      res,
      () =>
        serviceFn.apply(applicationService, [
          ...serviceArgsFn(req),
          data.id,
          data,
        ]),
      null,
      null,
      data
    );
  };
}

export function httpDeleteHandler(
  serviceFn: any,
  serviceArgsFn: (req: Request) => any[]
) {
  return (req: Request, res: Response) => {
    const body = req.body;

    if (Array.isArray(body)) {
      const ops = body.map((item: any) =>
        serviceFn.apply(applicationService, [...serviceArgsFn(req), item.id])
      );

      return httpRun(res, () => Promise.all(ops));
    }

    return httpRun(res, () =>
      serviceFn.apply(applicationService, [
        ...serviceArgsFn(req),
        req.params.id,
      ])
    );
  };
}
